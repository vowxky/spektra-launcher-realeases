import * as THREE from 'three';
import vertexShader from '../shaders/atmosphere.vert.glsl?raw';
import fragmentShader from '../shaders/atmosphere.frag.glsl?raw';
import displayShader from '../shaders/fluid/display.frag.glsl?raw';
import { createFluidSimulation } from './fluid';

export function createAtmosphere(host: HTMLElement): () => void {
  const renderer = new THREE.WebGLRenderer({
    alpha: true,
    antialias: false,
    powerPreference: 'low-power',
  });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1) * 0.7);
  renderer.setClearColor(0, 0);
  host.append(renderer.domElement);

  const fluid = createFluidSimulation(renderer);
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const material = new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0 },
      aspect: { value: 1 },
      horizon: { value: 0.3 },
      smoke: { value: fluid?.texture ?? null },
    },
    transparent: true,
    depthTest: false,
    depthWrite: false,
    vertexShader,
    fragmentShader: fluid ? displayShader : fragmentShader,
  });
  const geometry = new THREE.PlaneGeometry(2, 2);
  scene.add(new THREE.Mesh(geometry, material));
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const pointer = new THREE.Vector2();
  let pointerInside = false;
  let previous = performance.now();
  const start = previous;

  const resetPointer = () => {
    pointerInside = false;
    fluid?.cancelInput();
  };
  const movePointer = (event: PointerEvent) => {
    if (!fluid || reduced.matches || event.pointerType === 'touch') return;
    const x = THREE.MathUtils.clamp(event.clientX / innerWidth, 0, 1);
    const y = 1 - THREE.MathUtils.clamp(event.clientY / innerHeight, 0, 1);
    if (pointerInside) fluid.push(pointer.x, pointer.y, x, y);
    pointer.set(x, y);
    pointerInside = true;
  };
  const render = () => {
    if (fluid) material.uniforms.smoke.value = fluid.texture;
    renderer.render(scene, camera);
  };
  const resize = () => {
    renderer.setSize(innerWidth, innerHeight);
    material.uniforms.aspect.value = innerWidth / innerHeight;
    fluid?.resize(innerWidth, innerHeight);
    resetPointer();
    render();
  };
  const tick = (now: number) => {
    if (document.hidden || now - previous < 1000 / 30) return;
    const delta = Math.min((now - previous) / 1000, 0.05);
    previous = now;
    const elapsed = (now - start) / 1000;
    fluid?.update(delta, elapsed);
    material.uniforms.time.value = elapsed;
    render();
  };
  const updateMotion = () => {
    renderer.setAnimationLoop(reduced.matches ? null : tick);
    if (reduced.matches) {
      resetPointer();
      fluid?.reset();
      material.uniforms.time.value = 0;
      render();
    }
    previous = performance.now();
  };

  resize();
  updateMotion();
  window.addEventListener('resize', resize);
  window.addEventListener('pointermove', movePointer, { passive: true });
  window.addEventListener('blur', resetPointer);
  document.addEventListener('pointerleave', resetPointer);
  reduced.addEventListener('change', updateMotion);

  return () => {
    renderer.setAnimationLoop(null);
    window.removeEventListener('resize', resize);
    window.removeEventListener('pointermove', movePointer);
    window.removeEventListener('blur', resetPointer);
    document.removeEventListener('pointerleave', resetPointer);
    reduced.removeEventListener('change', updateMotion);
    fluid?.dispose();
    geometry.dispose();
    material.dispose();
    renderer.dispose();
    renderer.domElement.remove();
  };
}

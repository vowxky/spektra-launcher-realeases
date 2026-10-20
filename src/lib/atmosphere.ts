import * as THREE from 'three';
import vertexShader from '../shaders/atmosphere.vert.glsl?raw';
import fragmentShader from '../shaders/atmosphere.frag.glsl?raw';

export function createAtmosphere(host: HTMLElement): () => void {
  const renderer = new THREE.WebGLRenderer({
    alpha: true,
    antialias: false,
    powerPreference: 'low-power',
  });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1) * 0.7);
  renderer.setClearColor(0, 0);
  host.append(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const material = new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0 },
      aspect: { value: 1 },
      horizon: { value: 0.3 },
    },
    transparent: true,
    depthTest: false,
    depthWrite: false,
    vertexShader,
    fragmentShader,
  });
  const geometry = new THREE.PlaneGeometry(2, 2);
  scene.add(new THREE.Mesh(geometry, material));
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let previous = 0;
  const start = performance.now();
  const resize = () => {
    renderer.setSize(innerWidth, innerHeight);
    material.uniforms.aspect.value = innerWidth / innerHeight;
    renderer.render(scene, camera);
  };
  const tick = (now: number) => {
    if (document.hidden || now - previous < 1000 / 24) return;
    previous = now;
    material.uniforms.time.value = (now - start) / 1000;
    renderer.render(scene, camera);
  };
  const updateMotion = () => {
    renderer.setAnimationLoop(reduced.matches ? null : tick);
    if (reduced.matches) {
      material.uniforms.time.value = 0;
      renderer.render(scene, camera);
    }
  };
  resize();
  updateMotion();
  window.addEventListener('resize', resize);
  reduced.addEventListener('change', updateMotion);
  return () => {
    renderer.setAnimationLoop(null);
    window.removeEventListener('resize', resize);
    reduced.removeEventListener('change', updateMotion);
    geometry.dispose();
    material.dispose();
    renderer.dispose();
    renderer.domElement.remove();
  };
}

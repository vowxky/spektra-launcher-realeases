import * as THREE from 'three';
import vertexShader from '../shaders/atmosphere.vert.glsl?raw';
import sourceShader from '../shaders/atmosphere.frag.glsl?raw';
import advectShader from '../shaders/fluid/advect.frag.glsl?raw';
import splatShader from '../shaders/fluid/splat.frag.glsl?raw';
import curlShader from '../shaders/fluid/curl.frag.glsl?raw';
import vorticityShader from '../shaders/fluid/vorticity.frag.glsl?raw';
import divergenceShader from '../shaders/fluid/divergence.frag.glsl?raw';
import pressureShader from '../shaders/fluid/pressure.frag.glsl?raw';
import projectShader from '../shaders/fluid/project.frag.glsl?raw';
import smokeShader from '../shaders/fluid/smoke.frag.glsl?raw';

type BufferPair = {
  read: THREE.WebGLRenderTarget;
  write: THREE.WebGLRenderTarget;
};

export function createFluidSimulation(renderer: THREE.WebGLRenderer) {
  if (!renderer.extensions.has('EXT_color_buffer_float')) return null;

  const target = () => new THREE.WebGLRenderTarget(1, 1, {
    type: THREE.HalfFloatType,
    depthBuffer: false,
    stencilBuffer: false,
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
  });
  const pair = (): BufferPair => ({ read: target(), write: target() });
  const swap = (buffer: BufferPair) => {
    [buffer.read, buffer.write] = [buffer.write, buffer.read];
  };
  const velocity = pair();
  const pressure = pair();
  const smoke = pair();
  const curl = target();
  const divergence = target();
  const source = target();
  const targets = [
    velocity.read, velocity.write, pressure.read, pressure.write,
    smoke.read, smoke.write, curl, divergence, source,
  ];
  const texelSize = new THREE.Vector2(1, 1);
  const scale = new THREE.Vector2(1, 1);
  const strokeStart = new THREE.Vector2();
  const strokeEnd = new THREE.Vector2();
  const motion = new THREE.Vector2();
  const force = new THREE.Vector2();
  let pending = false;
  let lastSourceUpdate = 0;

  const materials: THREE.ShaderMaterial[] = [];
  const material = (shader: string, uniforms: Record<string, THREE.IUniform>) => {
    const result = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader: shader,
      uniforms,
      depthTest: false,
      depthWrite: false,
    });
    materials.push(result);
    return result;
  };
  const advect = material(advectShader, {
    velocity: { value: velocity.read.texture },
    field: { value: velocity.read.texture },
    scale: { value: scale },
    delta: { value: 0 },
  });
  const splat = material(splatShader, {
    velocity: { value: velocity.read.texture },
    start: { value: strokeStart },
    end: { value: strokeEnd },
    force: { value: force },
    scale: { value: scale },
  });
  const rotation = material(curlShader, {
    velocity: { value: velocity.read.texture },
    texelSize: { value: texelSize },
  });
  const confine = material(vorticityShader, {
    velocity: { value: velocity.read.texture },
    curl: { value: curl.texture },
    texelSize: { value: texelSize },
    delta: { value: 0 },
  });
  const divergencePass = material(divergenceShader, {
    velocity: { value: velocity.read.texture },
    texelSize: { value: texelSize },
  });
  const pressurePass = material(pressureShader, {
    pressure: { value: pressure.read.texture },
    divergence: { value: divergence.texture },
    texelSize: { value: texelSize },
  });
  const project = material(projectShader, {
    velocity: { value: velocity.read.texture },
    pressure: { value: pressure.read.texture },
    texelSize: { value: texelSize },
  });
  const transport = material(smokeShader, {
    velocity: { value: velocity.read.texture },
    smoke: { value: smoke.read.texture },
    source: { value: source.texture },
    scale: { value: scale },
    delta: { value: 0 },
  });
  const ambient = material(sourceShader, {
    time: { value: 0 },
    aspect: { value: 1 },
    horizon: { value: 0.3 },
  });
  const geometry = new THREE.PlaneGeometry(2, 2);
  const quad = new THREE.Mesh(geometry, ambient);
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  scene.add(quad);

  const draw = (pass: THREE.ShaderMaterial, destination: THREE.WebGLRenderTarget) => {
    quad.material = pass;
    renderer.setRenderTarget(destination);
    renderer.render(scene, camera);
  };
  const cancelInput = () => {
    pending = false;
    motion.set(0, 0);
  };
  const reset = () => {
    for (const buffer of targets) {
      renderer.setRenderTarget(buffer);
      renderer.clear();
    }
    ambient.uniforms.time.value = 0;
    draw(ambient, source);
    transport.uniforms.velocity.value = velocity.read.texture;
    transport.uniforms.smoke.value = source.texture;
    transport.uniforms.delta.value = 0;
    draw(transport, smoke.read);
    draw(transport, smoke.write);
    renderer.setRenderTarget(null);
    lastSourceUpdate = 0;
    cancelInput();
  };
  const resize = (width: number, height: number) => {
    const aspect = width / height;
    const simulationScale = Math.min(
      112 / Math.min(width, height),
      256 / Math.max(width, height),
    );
    const simulationWidth = Math.max(1, Math.round(width * simulationScale));
    const simulationHeight = Math.max(1, Math.round(height * simulationScale));
    const simulationBuffers = [
      velocity.read, velocity.write, pressure.read, pressure.write, curl, divergence,
    ];
    for (const buffer of simulationBuffers) {
      buffer.setSize(simulationWidth, simulationHeight);
    }
    const densityScale = Math.min(1, 640 / Math.max(width, height));
    for (const buffer of [smoke.read, smoke.write, source]) {
      buffer.setSize(
        Math.max(1, Math.round(width * densityScale)),
        Math.max(1, Math.round(height * densityScale)),
      );
    }
    texelSize.set(1 / simulationWidth, 1 / simulationHeight);
    scale.set(aspect, 1);
    ambient.uniforms.aspect.value = aspect;
    reset();
  };
  const push = (fromX: number, fromY: number, toX: number, toY: number) => {
    if (!pending) strokeStart.set(fromX, fromY);
    strokeEnd.set(toX, toY);
    motion.x += (toX - fromX) * scale.x;
    motion.y += toY - fromY;
    pending = true;
  };
  const step = (delta: number) => {
    advect.uniforms.velocity.value = velocity.read.texture;
    advect.uniforms.field.value = velocity.read.texture;
    advect.uniforms.delta.value = delta;
    draw(advect, velocity.write);
    swap(velocity);

    rotation.uniforms.velocity.value = velocity.read.texture;
    draw(rotation, curl);
    confine.uniforms.velocity.value = velocity.read.texture;
    confine.uniforms.delta.value = delta;
    draw(confine, velocity.write);
    swap(velocity);

    divergencePass.uniforms.velocity.value = velocity.read.texture;
    draw(divergencePass, divergence);
    for (let iteration = 0; iteration < 12; iteration++) {
      pressurePass.uniforms.pressure.value = pressure.read.texture;
      draw(pressurePass, pressure.write);
      swap(pressure);
    }
    project.uniforms.velocity.value = velocity.read.texture;
    project.uniforms.pressure.value = pressure.read.texture;
    draw(project, velocity.write);
    swap(velocity);

    transport.uniforms.velocity.value = velocity.read.texture;
    transport.uniforms.smoke.value = smoke.read.texture;
    transport.uniforms.delta.value = delta;
    draw(transport, smoke.write);
    swap(smoke);
  };
  const update = (delta: number, elapsed: number) => {
    if (elapsed - lastSourceUpdate >= 2) {
      ambient.uniforms.time.value = elapsed;
      draw(ambient, source);
      lastSourceUpdate = elapsed;
    }
    if (pending) {
      force.copy(motion)
        .multiplyScalar(0.45 / Math.max(delta, 1 / 60))
        .clampLength(0, 2.0);
      splat.uniforms.velocity.value = velocity.read.texture;
      draw(splat, velocity.write);
      swap(velocity);
      cancelInput();
    }
    const substeps = Math.max(1, Math.ceil(delta * 60));
    for (let i = 0; i < substeps; i++) step(delta / substeps);
    renderer.setRenderTarget(null);
  };

  return {
    get texture() {
      return smoke.read.texture;
    },
    resize,
    reset,
    push,
    cancelInput,
    update,
    dispose() {
      for (const buffer of targets) buffer.dispose();
      for (const pass of materials) pass.dispose();
      geometry.dispose();
    },
  };
}

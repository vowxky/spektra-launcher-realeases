uniform sampler2D velocity;
uniform sampler2D smoke;
uniform sampler2D source;
uniform vec2 scale;
uniform float delta;
varying vec2 vUv;

vec2 flowAt(vec2 uv) {
  return texture2D(velocity, uv).rg + vec2(-0.016, 0.008);
}

void main() {
  vec2 midpoint = vUv - 0.5 * delta * flowAt(vUv) / scale;
  vec2 origin = vUv - delta * flowAt(midpoint) / scale;
  float density = texture2D(smoke, origin).a;
  float ambient = texture2D(source, vUv).a;
  if (origin.x < 0.0 || origin.x > 1.0 || origin.y < 0.0 || origin.y > 1.0) density = ambient;
  density = mix(density, ambient, 1.0 - exp(-delta * 0.12));
  gl_FragColor = vec4(0.61, 0.65, 0.72, density);
}

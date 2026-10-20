uniform sampler2D velocity;
uniform sampler2D field;
uniform vec2 scale;
uniform float delta;
varying vec2 vUv;

void main() {
  vec2 flow = texture2D(velocity, vUv).rg;
  vec2 midpoint = vUv - 0.5 * delta * flow / scale;
  flow = texture2D(velocity, midpoint).rg;
  vec2 transported = texture2D(field, vUv - delta * flow / scale).rg;
  gl_FragColor = vec4(transported * exp(-delta * 0.65), 0.0, 1.0);
}

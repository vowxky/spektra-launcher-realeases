uniform sampler2D smoke;
varying vec2 vUv;

void main() {
  gl_FragColor = vec4(0.61, 0.65, 0.72, texture2D(smoke, vUv).a);
}

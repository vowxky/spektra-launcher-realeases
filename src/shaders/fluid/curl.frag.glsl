uniform sampler2D velocity;
uniform vec2 texelSize;
varying vec2 vUv;

void main() {
  float left = texture2D(velocity, vUv - vec2(texelSize.x, 0.0)).y;
  float right = texture2D(velocity, vUv + vec2(texelSize.x, 0.0)).y;
  float bottom = texture2D(velocity, vUv - vec2(0.0, texelSize.y)).x;
  float top = texture2D(velocity, vUv + vec2(0.0, texelSize.y)).x;
  float rotation = 0.5 * (right - left - top + bottom);
  gl_FragColor = vec4(rotation, 0.0, 0.0, 1.0);
}

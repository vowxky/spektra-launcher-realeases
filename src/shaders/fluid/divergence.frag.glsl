uniform sampler2D velocity;
uniform vec2 texelSize;
varying vec2 vUv;

void main() {
  vec2 center = texture2D(velocity, vUv).rg;
  float left = texture2D(velocity, vUv - vec2(texelSize.x, 0.0)).x;
  float right = texture2D(velocity, vUv + vec2(texelSize.x, 0.0)).x;
  float bottom = texture2D(velocity, vUv - vec2(0.0, texelSize.y)).y;
  float top = texture2D(velocity, vUv + vec2(0.0, texelSize.y)).y;
  if (vUv.x < texelSize.x) left = -center.x;
  if (vUv.x > 1.0 - texelSize.x) right = -center.x;
  if (vUv.y < texelSize.y) bottom = -center.y;
  if (vUv.y > 1.0 - texelSize.y) top = -center.y;
  float divergence = 0.5 * (right - left + top - bottom);
  gl_FragColor = vec4(divergence, 0.0, 0.0, 1.0);
}

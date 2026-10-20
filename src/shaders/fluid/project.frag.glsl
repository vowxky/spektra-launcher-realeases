uniform sampler2D velocity;
uniform sampler2D pressure;
uniform vec2 texelSize;
varying vec2 vUv;

void main() {
  float left = texture2D(pressure, vUv - vec2(texelSize.x, 0.0)).r;
  float right = texture2D(pressure, vUv + vec2(texelSize.x, 0.0)).r;
  float bottom = texture2D(pressure, vUv - vec2(0.0, texelSize.y)).r;
  float top = texture2D(pressure, vUv + vec2(0.0, texelSize.y)).r;
  vec2 flow = texture2D(velocity, vUv).rg - vec2(right - left, top - bottom);
  if (vUv.x < texelSize.x || vUv.x > 1.0 - texelSize.x) flow.x = 0.0;
  if (vUv.y < texelSize.y || vUv.y > 1.0 - texelSize.y) flow.y = 0.0;
  gl_FragColor = vec4(flow, 0.0, 1.0);
}

uniform sampler2D pressure;
uniform sampler2D divergence;
uniform vec2 texelSize;
varying vec2 vUv;

void main() {
  float left = texture2D(pressure, vUv - vec2(texelSize.x, 0.0)).r;
  float right = texture2D(pressure, vUv + vec2(texelSize.x, 0.0)).r;
  float bottom = texture2D(pressure, vUv - vec2(0.0, texelSize.y)).r;
  float top = texture2D(pressure, vUv + vec2(0.0, texelSize.y)).r;
  float divergenceValue = texture2D(divergence, vUv).r;
  gl_FragColor = vec4((left + right + bottom + top - divergenceValue) * 0.25, 0.0, 0.0, 1.0);
}

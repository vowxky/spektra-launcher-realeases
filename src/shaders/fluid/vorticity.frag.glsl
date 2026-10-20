uniform sampler2D velocity;
uniform sampler2D curl;
uniform vec2 texelSize;
uniform float delta;
varying vec2 vUv;

void main() {
  float left = abs(texture2D(curl, vUv - vec2(texelSize.x, 0.0)).r);
  float right = abs(texture2D(curl, vUv + vec2(texelSize.x, 0.0)).r);
  float bottom = abs(texture2D(curl, vUv - vec2(0.0, texelSize.y)).r);
  float top = abs(texture2D(curl, vUv + vec2(0.0, texelSize.y)).r);
  float rotation = texture2D(curl, vUv).r;
  vec2 gradient = vec2(right - left, top - bottom);
  gradient /= max(length(gradient), 0.0001);
  vec2 confinement = vec2(gradient.y, -gradient.x) * rotation * 32.0;
  vec2 flow = texture2D(velocity, vUv).rg + delta * confinement;
  flow *= min(1.0, 2.5 / max(length(flow), 0.0001));
  gl_FragColor = vec4(flow, 0.0, 1.0);
}

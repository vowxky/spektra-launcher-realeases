uniform sampler2D velocity;
uniform vec2 start;
uniform vec2 end;
uniform vec2 force;
uniform vec2 scale;
varying vec2 vUv;

void main() {
  vec2 segment = (end - start) * scale;
  vec2 relative = (vUv - start) * scale;
  float progress = clamp(dot(relative, segment) / max(dot(segment, segment), 0.000001), 0.0, 1.0);
  vec2 offset = relative - segment * progress;
  float influence = exp(-dot(offset, offset) / 0.003);
  vec2 flow = texture2D(velocity, vUv).rg;
  gl_FragColor = vec4(mix(flow, force, influence * 0.7), 0.0, 1.0);
}

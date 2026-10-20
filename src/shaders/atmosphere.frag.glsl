uniform float time;
uniform float aspect;
uniform float horizon;

varying vec2 vUv;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);

  return mix(
    mix(hash(i), hash(i + vec2(1, 0)), f.x),
    mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x),
    f.y
  );
}

float fbm(vec2 p) {
  float value = 0.0;
  float amplitude = 0.5;

  for (int i = 0; i < 5; i++) {
    value += amplitude * noise(p);
    p = mat2(1.6, 1.2, -1.2, 1.6) * p + 2.1;
    amplitude *= 0.5;
  }

  return value;
}

void main() {
  vec2 uv = vUv;
  vec2 p = uv * vec2(4.0 * aspect, 4.0) + vec2(time * 0.11, -time * 0.045);

  float warp = fbm(p * 0.7 + vec2(0.0, time * 0.025));
  float cloud = fbm(p + warp * 2.2);
  float detail = fbm(p * 2.0 + vec2(time * 0.02, 0.0));
  float density = smoothstep(0.24, 0.85, cloud) * (0.7 + detail * 0.5);
  float band = exp(-pow((uv.y - horizon) * 6.0, 2.0));
  float light = exp(-pow((uv.x - 0.58 - uv.y * 0.2) * 4.0, 2.0));
  float readability = mix(0.35, 1.0, smoothstep(0.15, 0.9, uv.x));
  float alpha = density * readability * (0.13 + band * 0.5 + light * 0.25);

  gl_FragColor = vec4(vec3(0.61, 0.65, 0.72), alpha);
}

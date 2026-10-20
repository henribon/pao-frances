export const VERTEX_SHADER = `
attribute vec3 aPosition;
attribute vec3 aNormal;
attribute float aCrumb;

uniform mat4 uProjection;
uniform mat4 uModelView;
uniform mat3 uNormalMatrix;

varying vec3 vNormal;
varying vec3 vViewPosition;
varying vec3 vModelPosition;
varying float vCrumb;

void main() {
  vec4 viewPosition = uModelView * vec4(aPosition, 1.0);
  vNormal = uNormalMatrix * aNormal;
  vViewPosition = viewPosition.xyz;
  vModelPosition = aPosition;
  vCrumb = aCrumb;
  gl_Position = uProjection * viewPosition;
}
`;

export const FRAGMENT_SHADER = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

varying vec3 vNormal;
varying vec3 vViewPosition;
varying vec3 vModelPosition;
varying float vCrumb;

const vec3 CRUST_DARK = vec3(0.541, 0.302, 0.114);
const vec3 CRUST_LIGHT = vec3(0.886, 0.655, 0.361);
const vec3 CRUMB = vec3(0.925, 0.867, 0.737);
const vec3 AMBIENT = vec3(0.32, 0.295, 0.285);
const vec3 KEY_LIGHT = vec3(1.0, 0.953, 0.878);
const vec3 FILL_LIGHT = vec3(0.482, 0.541, 0.627);
const vec3 KEY_DIRECTION = vec3(-0.38, 0.78, 0.5);
const vec3 FILL_DIRECTION = vec3(0.62, -0.2, 0.42);

float grain(vec3 position) {
  vec3 cell = floor(position * 110.0);
  return fract(sin(dot(cell, vec3(12.989, 78.233, 37.719))) * 43758.5453);
}

float mottle(vec3 position) {
  float broad = sin(position.x * 5.9 + position.y * 4.1) * sin(position.z * 7.7 - position.x * 3.3);
  float fine = sin(position.x * 17.3 + position.z * 12.7) * sin(position.y * 11.1 + position.x * 6.9);
  return 0.5 + 0.5 * (broad * 0.62 + fine * 0.38);
}

void main() {
  vec3 normal = normalize(vNormal);
  vec3 viewDirection = normalize(-vViewPosition);
  vec3 keyDirection = normalize(KEY_DIRECTION);
  vec3 fillDirection = normalize(FILL_DIRECTION);

  float crumbMask = smoothstep(0.24, 0.72, vCrumb);
  float bake = clamp(0.24 + mottle(vModelPosition) * 0.55 + grain(vModelPosition) * 0.17, 0.0, 1.0);
  vec3 base = mix(mix(CRUST_DARK, CRUST_LIGHT, bake), CRUMB, crumbMask);

  float key = max(dot(normal, keyDirection), 0.0);
  float wrapped = 0.5 + 0.5 * dot(normal, keyDirection);
  float diffuse = mix(key, wrapped * wrapped, 0.35);
  float fill = max(dot(normal, fillDirection), 0.0);
  float cavity = 1.0 - 0.45 * smoothstep(0.05, 0.85, vCrumb);

  vec3 light = AMBIENT * cavity + KEY_LIGHT * diffuse * 0.95 + FILL_LIGHT * fill * 0.22;

  vec3 halfVector = normalize(keyDirection + viewDirection);
  float gloss = pow(max(dot(normal, halfVector), 0.0), 26.0) * 0.18 * (1.0 - crumbMask);
  float rim = pow(1.0 - max(dot(normal, viewDirection), 0.0), 3.5) * 0.12;

  vec3 crumbGlow = CRUMB * crumbMask * 0.13;

  gl_FragColor = vec4(clamp(base * light + crumbGlow + gloss + KEY_LIGHT * rim, 0.0, 1.0), 1.0);
}
`;

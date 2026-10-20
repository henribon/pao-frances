import { surfacePoint } from './breadSurface.js';

const TAU = Math.PI * 2;
const LENGTH_SEGMENTS = 128;
const RING_SEGMENTS = 88;
const DELTA = 0.001;

const difference = (to, from) => [to.x - from.x, to.y - from.y, to.z - from.z];

const cross = (left, right) => [
  left[1] * right[2] - left[2] * right[1],
  left[2] * right[0] - left[0] * right[2],
  left[0] * right[1] - left[1] * right[0]
];

const normalize = vector => {
  const length = Math.hypot(vector[0], vector[1], vector[2]) || 1;
  return [vector[0] / length, vector[1] / length, vector[2] / length];
};

const normalAt = (lengthwise, around, origin) => {
  const alongLength = difference(surfacePoint(lengthwise + DELTA, around), origin);
  const aroundRing = difference(surfacePoint(lengthwise, around + DELTA), origin);
  return normalize(cross(alongLength, aroundRing));
};

const buildAttributes = () => {
  const rings = LENGTH_SEGMENTS + 1;
  const count = rings * RING_SEGMENTS;
  const positions = new Float32Array(count * 3);
  const normals = new Float32Array(count * 3);
  const crumb = new Float32Array(count);

  for (let ring = 0; ring < rings; ring += 1) {
    const lengthwise = ring / LENGTH_SEGMENTS;
    const sampled = Math.min(Math.max(lengthwise, DELTA), 1 - DELTA);
    const onAxis = sampled !== lengthwise;
    for (let step = 0; step < RING_SEGMENTS; step += 1) {
      const around = (step / RING_SEGMENTS) * TAU;
      const point = surfacePoint(lengthwise, around);
      const normal = normalAt(sampled, around, onAxis ? surfacePoint(sampled, around) : point);
      const vertex = ring * RING_SEGMENTS + step;
      positions[vertex * 3] = point.x;
      positions[vertex * 3 + 1] = point.y;
      positions[vertex * 3 + 2] = point.z;
      normals[vertex * 3] = normal[0];
      normals[vertex * 3 + 1] = normal[1];
      normals[vertex * 3 + 2] = normal[2];
      crumb[vertex] = point.crumb;
    }
  }

  return { positions, normals, crumb };
};

const buildIndices = () => {
  const indices = new Uint16Array(LENGTH_SEGMENTS * RING_SEGMENTS * 6);
  let cursor = 0;
  for (let ring = 0; ring < LENGTH_SEGMENTS; ring += 1) {
    for (let step = 0; step < RING_SEGMENTS; step += 1) {
      const next = (step + 1) % RING_SEGMENTS;
      const current = ring * RING_SEGMENTS;
      const forward = (ring + 1) * RING_SEGMENTS;
      indices[cursor] = current + step;
      indices[cursor + 1] = forward + step;
      indices[cursor + 2] = current + next;
      indices[cursor + 3] = forward + step;
      indices[cursor + 4] = forward + next;
      indices[cursor + 5] = current + next;
      cursor += 6;
    }
  }
  return indices;
};

export const createBreadMesh = () => ({ ...buildAttributes(), indices: buildIndices() });

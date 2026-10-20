import { surfacePoint } from './breadSurface.js';

const TAU = Math.PI * 2;
const LENGTH_SEGMENTS = 128;
const HALF_RING_SEGMENTS = 44;
const CAP_SEGMENTS = 4;
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

const gridIndices = (rows, columns) => {
  const indices = new Uint16Array((rows - 1) * (columns - 1) * 6);
  let cursor = 0;
  for (let row = 0; row < rows - 1; row += 1) {
    for (let column = 0; column < columns - 1; column += 1) {
      const current = row * columns + column;
      const forward = current + columns;
      indices[cursor] = current;
      indices[cursor + 1] = forward;
      indices[cursor + 2] = current + 1;
      indices[cursor + 3] = forward;
      indices[cursor + 4] = forward + 1;
      indices[cursor + 5] = current + 1;
      cursor += 6;
    }
  }
  return indices;
};

const allocate = count => ({
  positions: new Float32Array(count * 3),
  normals: new Float32Array(count * 3),
  crumb: new Float32Array(count),
  shade: new Float32Array(count)
});

const write = (target, vertex, point, normal, crumb, shade) => {
  target.positions[vertex * 3] = point.x;
  target.positions[vertex * 3 + 1] = point.y;
  target.positions[vertex * 3 + 2] = point.z;
  target.normals[vertex * 3] = normal[0];
  target.normals[vertex * 3 + 1] = normal[1];
  target.normals[vertex * 3 + 2] = normal[2];
  target.crumb[vertex] = crumb;
  target.shade[vertex] = shade;
};

const buildCrust = (fromAngle, toAngle) => {
  const rows = LENGTH_SEGMENTS + 1;
  const columns = HALF_RING_SEGMENTS + 1;
  const target = allocate(rows * columns);

  for (let row = 0; row < rows; row += 1) {
    const lengthwise = row / LENGTH_SEGMENTS;
    const sampled = Math.min(Math.max(lengthwise, DELTA), 1 - DELTA);
    const onAxis = sampled !== lengthwise;
    for (let column = 0; column < columns; column += 1) {
      const around = fromAngle + (toAngle - fromAngle) * (column / HALF_RING_SEGMENTS);
      const point = surfacePoint(lengthwise, around);
      const origin = onAxis ? surfacePoint(sampled, around) : point;
      write(target, row * columns + column, point, normalAt(sampled, around, origin), point.crumb, point.crumb);
    }
  }

  return { ...target, indices: gridIndices(rows, columns) };
};

const buildCut = facing => {
  const rows = LENGTH_SEGMENTS + 1;
  const columns = CAP_SEGMENTS + 1;
  const target = allocate(rows * columns);
  const normal = [0, facing, 0];

  for (let row = 0; row < rows; row += 1) {
    const lengthwise = row / LENGTH_SEGMENTS;
    const front = surfacePoint(lengthwise, 0);
    const back = surfacePoint(lengthwise, Math.PI);
    const start = facing < 0 ? back.z : front.z;
    const end = facing < 0 ? front.z : back.z;
    for (let column = 0; column < columns; column += 1) {
      const across = column / CAP_SEGMENTS;
      const point = { x: front.x, y: 0, z: start + (end - start) * across };
      write(target, row * columns + column, point, normal, 1, 0);
    }
  }

  return { ...target, indices: gridIndices(rows, columns) };
};

const merge = parts => {
  const vertexCount = parts.reduce((total, part) => total + part.crumb.length, 0);
  const indexCount = parts.reduce((total, part) => total + part.indices.length, 0);
  const merged = allocate(vertexCount);
  const indices = new Uint16Array(indexCount);
  let vertexOffset = 0;
  let indexOffset = 0;

  parts.forEach(part => {
    merged.positions.set(part.positions, vertexOffset * 3);
    merged.normals.set(part.normals, vertexOffset * 3);
    merged.crumb.set(part.crumb, vertexOffset);
    merged.shade.set(part.shade, vertexOffset);
    for (let index = 0; index < part.indices.length; index += 1) {
      indices[indexOffset + index] = part.indices[index] + vertexOffset;
    }
    vertexOffset += part.crumb.length;
    indexOffset += part.indices.length;
  });

  return { ...merged, indices };
};

export const createBreadHalves = () => ({
  upper: merge([buildCrust(0, Math.PI), buildCut(-1)]),
  lower: merge([buildCrust(Math.PI, TAU), buildCut(1)])
});

export const perspective = (fieldOfView, aspect, near, far) => {
  const focal = 1 / Math.tan(fieldOfView / 2);
  const depth = 1 / (near - far);
  return new Float32Array([
    focal / aspect, 0, 0, 0,
    0, focal, 0, 0,
    0, 0, (far + near) * depth, -1,
    0, 0, 2 * far * near * depth, 0
  ]);
};

export const rotationX = angle => {
  const cosine = Math.cos(angle);
  const sine = Math.sin(angle);
  return new Float32Array([
    1, 0, 0, 0,
    0, cosine, sine, 0,
    0, -sine, cosine, 0,
    0, 0, 0, 1
  ]);
};

export const rotationY = angle => {
  const cosine = Math.cos(angle);
  const sine = Math.sin(angle);
  return new Float32Array([
    cosine, 0, -sine, 0,
    0, 1, 0, 0,
    sine, 0, cosine, 0,
    0, 0, 0, 1
  ]);
};

export const translation = (x, y, z) => new Float32Array([
  1, 0, 0, 0,
  0, 1, 0, 0,
  0, 0, 1, 0,
  x, y, z, 1
]);

export const multiply = (left, right) => {
  const result = new Float32Array(16);
  for (let column = 0; column < 4; column += 1) {
    for (let row = 0; row < 4; row += 1) {
      let sum = 0;
      for (let step = 0; step < 4; step += 1) {
        sum += left[step * 4 + row] * right[column * 4 + step];
      }
      result[column * 4 + row] = sum;
    }
  }
  return result;
};

export const rotationPart = matrix => new Float32Array([
  matrix[0], matrix[1], matrix[2],
  matrix[4], matrix[5], matrix[6],
  matrix[8], matrix[9], matrix[10]
]);

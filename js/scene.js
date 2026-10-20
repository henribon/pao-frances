import { perspective, rotationX, rotationY, translation, multiply, rotationPart } from './matrix.js';
import { VERTEX_SHADER, FRAGMENT_SHADER } from './breadShaders.js';
import { createBreadHalves } from './breadMesh.js';
import { halfLength, halfHeight, halfDepth, surfacePoint } from './breadSurface.js';
import { MAX_TILT } from './viewAngles.js';

const FIELD_OF_VIEW = 0.62;
const NEAR = 0.1;
const FAR = 24;
const MARGIN = 1.05;
const MAX_PIXEL_RATIO = 2;
const MAX_OPEN = 1.2;
const OPEN_ZOOM = 0.3;

const compileShader = (gl, type, source) => {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(shader));
  }
  return shader;
};

const createProgram = (gl, vertexSource, fragmentSource) => {
  const program = gl.createProgram();
  gl.attachShader(program, compileShader(gl, gl.VERTEX_SHADER, vertexSource));
  gl.attachShader(program, compileShader(gl, gl.FRAGMENT_SHADER, fragmentSource));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(gl.getProgramInfoLog(program));
  }
  return program;
};

const createAttribute = (gl, program, name, data, size) => {
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
  const location = gl.getAttribLocation(program, name);
  gl.enableVertexAttribArray(location);
  return () => {
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.vertexAttribPointer(location, size, gl.FLOAT, false, 0, 0);
  };
};

const createDrawable = (gl, program, mesh) => {
  const attributes = [
    createAttribute(gl, program, 'aPosition', mesh.positions, 3),
    createAttribute(gl, program, 'aNormal', mesh.normals, 3),
    createAttribute(gl, program, 'aCrumb', mesh.crumb, 1),
    createAttribute(gl, program, 'aShade', mesh.shade, 1)
  ];
  const indexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, mesh.indices, gl.STATIC_DRAW);

  return {
    count: mesh.indices.length,
    bind: () => {
      attributes.forEach(apply => apply());
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    }
  };
};

const createButterTexture = (gl, source) => {
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
  return texture;
};

const hingeMatrix = angle => multiply(
  translation(0, 0, -halfDepth),
  multiply(rotationX(-angle), translation(0, 0, halfDepth))
);

const transposeApply = (matrix, vector) => [
  matrix[0] * vector[0] + matrix[1] * vector[1] + matrix[2] * vector[2],
  matrix[4] * vector[0] + matrix[5] * vector[1] + matrix[6] * vector[2],
  matrix[8] * vector[0] + matrix[9] * vector[1] + matrix[10] * vector[2]
];

const hitCutFace = (modelView, direction) => {
  const shift = transposeApply(modelView, [modelView[12], modelView[13], modelView[14]]);
  const ray = transposeApply(modelView, direction);
  if (Math.abs(ray[1]) < 1e-6) return null;

  const travel = shift[1] / ray[1];
  if (travel <= 0) return null;

  const x = ray[0] * travel - shift[0];
  const z = ray[2] * travel - shift[2];
  const along = x / (halfLength * 2) + 0.5;
  if (along < 0 || along > 1) return null;

  const front = surfacePoint(along, 0).z;
  const back = surfacePoint(along, Math.PI).z;
  if (z > front || z < back) return null;

  return { travel, along, across: z / (halfDepth * 2) + 0.5 };
};

const sweptHeight = Math.hypot(halfLength * Math.sin(MAX_TILT), halfHeight);

const cameraDistance = aspect => {
  const vertical = Math.tan(FIELD_OF_VIEW / 2);
  return MARGIN * Math.max(sweptHeight / vertical, halfLength / (vertical * aspect));
};

export const createScene = (canvas, butter) => {
  const gl = canvas.getContext('webgl', { antialias: true, alpha: true, premultipliedAlpha: true });
  if (!gl) return null;

  const program = createProgram(gl, VERTEX_SHADER, FRAGMENT_SHADER);
  const halves = createBreadHalves();

  gl.useProgram(program);
  const upper = createDrawable(gl, program, halves.upper);
  const lower = createDrawable(gl, program, halves.lower);

  const projectionLocation = gl.getUniformLocation(program, 'uProjection');
  const modelViewLocation = gl.getUniformLocation(program, 'uModelView');
  const normalMatrixLocation = gl.getUniformLocation(program, 'uNormalMatrix');
  const butterRegionLocation = gl.getUniformLocation(program, 'uButterRegion');

  gl.activeTexture(gl.TEXTURE0);
  createButterTexture(gl, butter.canvas);
  gl.uniform1i(gl.getUniformLocation(program, 'uButter'), 0);
  gl.uniform2f(gl.getUniformLocation(program, 'uButterScale'), 1 / (halfLength * 2), 1 / (halfDepth * 2));

  gl.enable(gl.DEPTH_TEST);
  gl.enable(gl.CULL_FACE);
  gl.clearColor(0, 0, 0, 0);

  let distance = 0;
  let lowerView = null;
  let upperView = null;

  const fitToCanvas = () => {
    const ratio = Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO);
    const width = Math.max(1, Math.round(canvas.clientWidth * ratio));
    const height = Math.max(1, Math.round(canvas.clientHeight * ratio));
    canvas.width = width;
    canvas.height = height;
    gl.viewport(0, 0, width, height);

    const aspect = width / height;
    distance = cameraDistance(aspect);
    gl.uniformMatrix4fv(projectionLocation, false, perspective(FIELD_OF_VIEW, aspect, NEAR, FAR));
  };

  fitToCanvas();
  new ResizeObserver(fitToCanvas).observe(canvas);

  const drawPart = (part, modelView, region) => {
    part.bind();
    gl.uniform1f(butterRegionLocation, region);
    gl.uniformMatrix4fv(modelViewLocation, false, modelView);
    gl.uniformMatrix3fv(normalMatrixLocation, false, rotationPart(modelView));
    gl.drawElements(gl.TRIANGLES, part.count, gl.UNSIGNED_SHORT, 0);
  };

  const draw = (spin, tilt, openness) => {
    const orientation = multiply(rotationX(tilt), rotationY(spin));
    const view = translation(0, 0, -distance * (1 + openness * OPEN_ZOOM));
    lowerView = multiply(view, orientation);
    upperView = multiply(lowerView, hingeMatrix(openness * MAX_OPEN));

    if (butter.takeDirty()) {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, butter.canvas);
    }

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    drawPart(lower, lowerView, butter.regionOf('lower'));
    drawPart(upper, upperView, butter.regionOf('upper'));
  };

  const pick = (clientX, clientY) => {
    if (!lowerView || !upperView) return null;
    const bounds = canvas.getBoundingClientRect();
    const vertical = Math.tan(FIELD_OF_VIEW / 2);
    const direction = [
      (((clientX - bounds.left) / bounds.width) * 2 - 1) * vertical * (canvas.width / canvas.height),
      (1 - ((clientY - bounds.top) / bounds.height) * 2) * vertical,
      -1
    ];

    const candidates = [
      { half: 'lower', hit: hitCutFace(lowerView, direction) },
      { half: 'upper', hit: hitCutFace(upperView, direction) }
    ].filter(candidate => candidate.hit);

    if (!candidates.length) return null;

    const nearest = candidates.reduce((best, candidate) => (
      candidate.hit.travel < best.hit.travel ? candidate : best
    ));

    return { half: nearest.half, along: nearest.hit.along, across: nearest.hit.across };
  };

  return { draw, pick };
};

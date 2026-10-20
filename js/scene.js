import { perspective, rotationX, rotationY, translation, multiply, rotationPart } from './matrix.js';
import { VERTEX_SHADER, FRAGMENT_SHADER } from './breadShaders.js';
import { createBreadHalves } from './breadMesh.js';
import { halfLength, halfHeight, halfDepth } from './breadSurface.js';
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

const hingeMatrix = angle => multiply(
  translation(0, 0, -halfDepth),
  multiply(rotationX(-angle), translation(0, 0, halfDepth))
);

const sweptHeight = Math.hypot(halfLength * Math.sin(MAX_TILT), halfHeight);

const cameraDistance = aspect => {
  const vertical = Math.tan(FIELD_OF_VIEW / 2);
  return MARGIN * Math.max(sweptHeight / vertical, halfLength / (vertical * aspect));
};

export const createScene = canvas => {
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

  gl.enable(gl.DEPTH_TEST);
  gl.enable(gl.CULL_FACE);
  gl.clearColor(0, 0, 0, 0);

  let distance = 0;

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

  const drawPart = (part, modelView) => {
    part.bind();
    gl.uniformMatrix4fv(modelViewLocation, false, modelView);
    gl.uniformMatrix3fv(normalMatrixLocation, false, rotationPart(modelView));
    gl.drawElements(gl.TRIANGLES, part.count, gl.UNSIGNED_SHORT, 0);
  };

  const draw = (spin, tilt, openness) => {
    const orientation = multiply(rotationX(tilt), rotationY(spin));
    const view = translation(0, 0, -distance * (1 + openness * OPEN_ZOOM));
    const base = multiply(view, orientation);

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    drawPart(lower, base);
    drawPart(upper, multiply(base, hingeMatrix(openness * MAX_OPEN)));
  };

  return { draw };
};

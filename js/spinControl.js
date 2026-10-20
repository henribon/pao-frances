import { INITIAL_TILT, MAX_TILT } from './viewAngles.js';

const TAU = Math.PI * 2;
const IDLE_SPEED = 0.0005;
const DRAG_SENSITIVITY = 0.009;
const TILT_SENSITIVITY = 0.006;
const MAX_SPEED = 0.02;
const RELAX_MS = 1200;
const SETTLE_MS = 600;
const MAX_STEP_MS = 64;
const SMOOTHING = 0.7;

const clamp = (value, limit) => Math.min(Math.max(value, -limit), limit);

export const createSpinControl = (element, isPaused) => {
  let spin = 0;
  let tilt = INITIAL_TILT;
  let speed = IDLE_SPEED;
  let dragging = false;
  let previousX = 0;
  let previousY = 0;
  let previousTime = 0;

  const start = event => {
    if (isPaused()) return;
    dragging = true;
    speed = 0;
    previousX = event.clientX;
    previousY = event.clientY;
    previousTime = event.timeStamp;
    element.setPointerCapture(event.pointerId);
  };

  const move = event => {
    if (!dragging) return;
    const deltaSpin = (event.clientX - previousX) * DRAG_SENSITIVITY;
    const elapsed = Math.max(event.timeStamp - previousTime, 1);
    spin += deltaSpin;
    tilt = clamp(tilt + (event.clientY - previousY) * TILT_SENSITIVITY, MAX_TILT);
    speed = speed * SMOOTHING + (deltaSpin / elapsed) * (1 - SMOOTHING);
    previousX = event.clientX;
    previousY = event.clientY;
    previousTime = event.timeStamp;
  };

  const end = () => {
    if (!dragging) return;
    dragging = false;
    speed = clamp(speed, MAX_SPEED);
  };

  element.addEventListener('pointerdown', start);
  element.addEventListener('pointermove', move);
  element.addEventListener('pointerup', end);
  element.addEventListener('pointercancel', end);

  const settle = step => {
    const approach = 1 - Math.exp(-step / SETTLE_MS);
    spin += (Math.round(spin / TAU) * TAU - spin) * approach;
    tilt += (INITIAL_TILT - tilt) * approach;
    speed = 0;
  };

  const advance = elapsed => {
    if (dragging) return { spin, tilt };
    const step = Math.min(elapsed, MAX_STEP_MS);
    if (isPaused()) {
      settle(step);
      return { spin, tilt };
    }
    speed += (IDLE_SPEED - speed) * (1 - Math.exp(-step / RELAX_MS));
    spin += speed * step;
    return { spin, tilt };
  };

  return { advance };
};

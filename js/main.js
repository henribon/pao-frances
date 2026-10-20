import { createScene } from './scene.js';
import { createSpinControl } from './spinControl.js';

const canvas = document.getElementById('pao');
const scene = createScene(canvas);

if (scene) {
  const control = createSpinControl(canvas);
  let previous = performance.now();

  const frame = now => {
    const { spin, tilt } = control.advance(now - previous);
    previous = now;
    scene.draw(spin, tilt);
    requestAnimationFrame(frame);
  };

  requestAnimationFrame(frame);
}

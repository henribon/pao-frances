import { createScene } from './scene.js';
import { createSpinControl } from './spinControl.js';
import { createCutControl } from './cutControl.js';

const canvas = document.getElementById('pao');
const scene = createScene(canvas);

if (scene) {
  const rotation = createSpinControl(canvas);
  const cut = createCutControl(document.querySelector('.cut'), document.body);
  let previous = performance.now();

  const frame = now => {
    const elapsed = now - previous;
    previous = now;
    const { spin, tilt } = rotation.advance(elapsed);
    scene.draw(spin, tilt, cut.advance(elapsed));
    requestAnimationFrame(frame);
  };

  requestAnimationFrame(frame);
}

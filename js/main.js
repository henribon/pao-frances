import { createScene } from './scene.js';
import { createSpinControl } from './spinControl.js';
import { createCutControl } from './cutControl.js';
import { createButter } from './butter.js';
import { createButterControl } from './butterControl.js';

const canvas = document.getElementById('pao');
const butter = createButter();
const scene = createScene(canvas, butter);

if (scene) {
  const cut = createCutControl(document.querySelector('.cut'), document.body);
  const rotation = createSpinControl(canvas, cut.isOpen);
  createButterControl({ element: canvas, butter, pick: scene.pick, isActive: cut.isOpen });
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

import { createScene } from './scene.js';

const SPIN_SPEED = 0.0005;

const canvas = document.getElementById('pao');
const scene = createScene(canvas);

if (scene) {
  const frame = elapsed => {
    scene.draw(elapsed * SPIN_SPEED);
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

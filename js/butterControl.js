const SUBSTEPS = 10;

export const createButterControl = ({ element, butter, pick, isActive }) => {
  let painting = false;
  let previous = null;

  const apply = (clientX, clientY) => {
    const hit = pick(clientX, clientY);
    if (!hit) {
      previous = null;
      return;
    }
    if (previous && previous.half === hit.half) {
      for (let step = 1; step <= SUBSTEPS; step += 1) {
        const ratio = step / SUBSTEPS;
        butter.paint(
          hit.half,
          previous.along + (hit.along - previous.along) * ratio,
          previous.across + (hit.across - previous.across) * ratio
        );
      }
    } else {
      butter.paint(hit.half, hit.along, hit.across);
    }
    previous = hit;
  };

  const stop = () => {
    painting = false;
    previous = null;
  };

  element.addEventListener('pointerdown', event => {
    if (!isActive()) return;
    painting = true;
    previous = null;
    element.setPointerCapture(event.pointerId);
    apply(event.clientX, event.clientY);
  });

  element.addEventListener('pointermove', event => {
    if (!painting || !isActive()) return;
    apply(event.clientX, event.clientY);
  });

  element.addEventListener('pointerup', stop);
  element.addEventListener('pointercancel', stop);
};

const OPEN_MS = 650;
const MAX_STEP_MS = 64;

const ease = progress => progress * progress * (3 - 2 * progress);

export const createCutControl = (button, root) => {
  let progress = 0;
  let target = 0;

  const toggle = () => {
    target = target > 0 ? 0 : 1;
    button.textContent = target > 0 ? 'fechar' : 'cortar';
    root.classList.toggle('is-cut', target > 0);
  };

  button.addEventListener('click', toggle);

  const advance = elapsed => {
    const step = Math.min(elapsed, MAX_STEP_MS) / OPEN_MS;
    progress += Math.min(Math.max(target - progress, -step), step);
    return ease(progress);
  };

  return { advance };
};

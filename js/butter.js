const WIDTH = 512;
const HEIGHT = 256;
const BRUSH_RADIUS = 22;
const BRUSH_ALPHA = 0.3;

const REGION_OFFSET = { lower: 0, upper: 0.5 };

export const createButter = () => {
  const canvas = document.createElement('canvas');
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const context = canvas.getContext('2d');
  let dirty = true;

  const paint = (half, along, across) => {
    const x = along * WIDTH;
    const y = (across * 0.5 + REGION_OFFSET[half]) * HEIGHT;
    const brush = context.createRadialGradient(x, y, 0, x, y, BRUSH_RADIUS);
    brush.addColorStop(0, `rgba(255, 255, 255, ${BRUSH_ALPHA})`);
    brush.addColorStop(1, 'rgba(255, 255, 255, 0)');
    context.fillStyle = brush;
    context.fillRect(x - BRUSH_RADIUS, y - BRUSH_RADIUS, BRUSH_RADIUS * 2, BRUSH_RADIUS * 2);
    dirty = true;
  };

  const takeDirty = () => {
    const pending = dirty;
    dirty = false;
    return pending;
  };

  return { canvas, paint, takeDirty, regionOf: half => REGION_OFFSET[half] };
};

const TAU = Math.PI * 2;

const LENGTH = 3.05;
const RADIUS = 0.52;
const TAPER = 0.45;
const SECTION_TOP = 0.98;
const SECTION_BOTTOM = 0.72;
const SLASH_START = 0.17;
const SLASH_END = 0.83;
const SLASH_DEPTH = 0.34;
const SLASH_SPREAD = 0.26;
const LIP_HEIGHT = 0.19;
const LIP_OFFSET = 0.6;
const LIP_SPREAD = 0.24;

const taper = lengthwise => Math.pow(Math.sin(Math.PI * lengthwise), TAPER);

const slashReach = lengthwise => {
  const span = (lengthwise - SLASH_START) / (SLASH_END - SLASH_START);
  if (span <= 0 || span >= 1) return 0;
  return Math.pow(Math.sin(Math.PI * span), 0.9);
};

const angleFromTop = around => {
  const offset = around - Math.PI / 2;
  return Math.abs(offset > Math.PI ? offset - TAU : offset);
};

const bell = (distance, spread) => Math.exp(-(distance * distance) / (2 * spread * spread));

const crustRelief = (lengthwise, around) =>
  0.018 * Math.sin(5 * around + 7.1 * lengthwise) * Math.sin(9.4 * Math.PI * lengthwise) +
  0.012 * Math.sin(9 * around - 4.3 * lengthwise) * Math.sin(5.1 * Math.PI * lengthwise + 1.3) +
  0.008 * Math.sin(13 * around + 2.2) * Math.sin(13.7 * Math.PI * lengthwise);

export const surfacePoint = (lengthwise, around) => {
  const reach = slashReach(lengthwise);
  const fromTop = angleFromTop(around);
  const groove = bell(fromTop, SLASH_SPREAD) * reach;
  const lip = bell(fromTop - LIP_OFFSET, LIP_SPREAD) * reach;
  const relief = crustRelief(lengthwise, around) + LIP_HEIGHT * lip - SLASH_DEPTH * groove;
  const radius = RADIUS * taper(lengthwise) * (1 + relief);
  const vertical = Math.sin(around);
  const section = SECTION_BOTTOM + (SECTION_TOP - SECTION_BOTTOM) * (0.5 + 0.5 * vertical);
  return {
    x: (lengthwise - 0.5) * LENGTH,
    y: radius * vertical * section,
    z: radius * Math.cos(around),
    crumb: groove
  };
};

export const halfLength = LENGTH / 2;

export const halfHeight = RADIUS * (1 + LIP_HEIGHT) * SECTION_TOP;

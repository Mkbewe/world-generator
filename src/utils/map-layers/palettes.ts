import type { Color, DiscreteOverflow, PaletteSpec, RampStop } from './layer-spec';

export type PixelWriter = (pixels: Uint8ClampedArray, offset: number, value: number) => void;

export const REGION_COLORS = [
  [46, 125, 50],
  [124, 179, 66],
  [253, 216, 53],
  [229, 57, 53],
  [142, 36, 170],
  [30, 136, 229],
  [255, 112, 67],
  [0, 137, 123],
] as const satisfies readonly Color[];

/** Earthy palette of the landmass id map; the first color belongs to structure one. */
export const LANDMASS_COLORS = [
  [120, 160, 90],
  [196, 172, 118],
  [96, 136, 84],
  [168, 140, 100],
  [140, 176, 116],
  [178, 156, 104],
  [110, 150, 130],
  [156, 128, 88],
] as const satisfies readonly Color[];

const UNKNOWN_COLOR = [120, 120, 120] as const satisfies Color;

export function regionColor(index: number): Color {
  return Number.isInteger(index) && index >= 0
    ? (REGION_COLORS[index % REGION_COLORS.length] ?? UNKNOWN_COLOR)
    : UNKNOWN_COLOR;
}

export function validatePalette(palette: PaletteSpec): void {
  if (palette.kind === 'solid') {
    validateColor(palette.color);
    return;
  }
  if (palette.kind === 'discrete') {
    if (palette.colors.length === 0) {
      throw new Error('A discrete palette requires at least one color.');
    }
    palette.colors.forEach(validateColor);
    if (palette.offset !== undefined && !Number.isInteger(palette.offset)) {
      throw new Error('A discrete palette offset must be an integer.');
    }
    if (palette.overflow !== 'cycle') {
      validateColor(palette.overflow.color);
    }
    return;
  }
  if (palette.stops.length < 2) {
    throw new Error('A ramp palette requires at least two stops.');
  }
  let previous = -Infinity;
  for (const stop of palette.stops) {
    if (!Number.isFinite(stop.at) || stop.at <= previous) {
      throw new Error('Ramp stops must have finite, strictly increasing values.');
    }
    validateColor(stop.color);
    previous = stop.at;
  }
}

/** Compiles declarative palette data once, outside the pixel loop. */
export function compilePalette(palette: PaletteSpec): PixelWriter {
  validatePalette(palette);
  if (palette.kind === 'solid') {
    const [red, green, blue] = palette.color;
    return (pixels, offset) => {
      pixels[offset] = red;
      pixels[offset + 1] = green;
      pixels[offset + 2] = blue;
      pixels[offset + 3] = 255;
    };
  }
  if (palette.kind === 'discrete') {
    const { colors, overflow } = palette;
    const shift = palette.offset ?? 0;
    return (pixels, offset, value) => {
      const index = Number.isInteger(value) && value + shift >= 0 ? value + shift : undefined;
      const color = discreteColor(colors, overflow, index);
      writeColor(pixels, offset, color[0], color[1], color[2]);
    };
  }
  return compileRamp(palette.stops);
}

function discreteColor(
  colors: readonly Color[],
  overflow: DiscreteOverflow,
  index: number | undefined
): Color {
  if (overflow !== 'cycle') {
    return index === undefined ? overflow.color : (colors[index] ?? overflow.color);
  }
  if (index === undefined) {
    return UNKNOWN_COLOR;
  }
  return colors[index % colors.length];
}

function compileRamp(stops: readonly RampStop[]): PixelWriter {
  const first = stops[0];
  const last = stops[stops.length - 1];
  if (stops.length === 2 && isGray(first.color) && isGray(last.color)) {
    return compileGrayRamp(first, last);
  }
  return (pixels, offset, value) => {
    if (Number.isNaN(value)) {
      writeColor(pixels, offset, 0, 0, 0);
      return;
    }
    if (value <= first.at) {
      writeTuple(pixels, offset, first.color);
      return;
    }
    for (let index = 1; index < stops.length; index++) {
      const to = stops[index];
      if (value <= to.at) {
        const from = stops[index - 1];
        const position = (value - from.at) / (to.at - from.at);
        writeColor(
          pixels,
          offset,
          Math.round(from.color[0] + (to.color[0] - from.color[0]) * position),
          Math.round(from.color[1] + (to.color[1] - from.color[1]) * position),
          Math.round(from.color[2] + (to.color[2] - from.color[2]) * position)
        );
        return;
      }
    }
    writeTuple(pixels, offset, last.color);
  };
}

function compileGrayRamp(first: RampStop, last: RampStop): PixelWriter {
  const from = first.color[0];
  const colorRange = last.color[0] - from;
  const valueRange = last.at - first.at;
  return (pixels, offset, value) => {
    let color: number;
    if (Number.isNaN(value)) {
      color = 0;
    } else if (value <= first.at) {
      color = from;
    } else if (value >= last.at) {
      color = last.color[0];
    } else {
      color = Math.round(from + ((value - first.at) / valueRange) * colorRange);
    }
    pixels[offset] = color;
    pixels[offset + 1] = color;
    pixels[offset + 2] = color;
    pixels[offset + 3] = 255;
  };
}

function isGray(color: Color): boolean {
  return color[0] === color[1] && color[1] === color[2];
}

function validateColor(color: Color): void {
  if (
    color.length !== 3 ||
    color.some(channel => !Number.isInteger(channel) || channel < 0 || channel > 255)
  ) {
    throw new Error('Palette colors must contain three integer channels in the 0..255 range.');
  }
}

function writeTuple(pixels: Uint8ClampedArray, offset: number, color: Color): void {
  writeColor(pixels, offset, color[0], color[1], color[2]);
}

function writeColor(
  pixels: Uint8ClampedArray,
  offset: number,
  red: number,
  green: number,
  blue: number
): void {
  pixels[offset] = red;
  pixels[offset + 1] = green;
  pixels[offset + 2] = blue;
  pixels[offset + 3] = 255;
}

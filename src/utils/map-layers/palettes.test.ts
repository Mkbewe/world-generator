import type { PaletteSpec } from './layer-spec';
import { compilePalette, regionColor, validatePalette } from './palettes';

function color(palette: PaletteSpec, value: number): number[] {
  const pixels = new Uint8ClampedArray(4);
  compilePalette(palette)(pixels, 0, value);
  return [...pixels];
}

describe('palette compiler', () => {
  it('writes an opaque solid color', () => {
    expect(color({ kind: 'solid', color: [16, 42, 67] }, 123)).toEqual([16, 42, 67, 255]);
  });

  it('clamps and interpolates ramps in the source value domain', () => {
    const palette = {
      kind: 'ramp',
      stops: [
        { at: -1, color: [0, 10, 20] },
        { at: 1, color: [100, 110, 120] },
      ],
    } as const satisfies PaletteSpec;

    expect(color(palette, -2)).toEqual([0, 10, 20, 255]);
    expect(color(palette, 0)).toEqual([50, 60, 70, 255]);
    expect(color(palette, 2)).toEqual([100, 110, 120, 255]);
    expect(color(palette, Number.NaN)).toEqual([0, 0, 0, 255]);
  });

  it('preserves ramp semantics for the optimized grayscale path', () => {
    const palette = {
      kind: 'ramp',
      stops: [
        { at: 0, color: [10, 10, 10] },
        { at: 2, color: [110, 110, 110] },
      ],
    } as const satisfies PaletteSpec;

    expect(color(palette, -1)).toEqual([10, 10, 10, 255]);
    expect(color(palette, 1)).toEqual([60, 60, 60, 255]);
    expect(color(palette, 3)).toEqual([110, 110, 110, 255]);
    expect(color(palette, Number.NaN)).toEqual([0, 0, 0, 255]);
  });

  it('supports cycling and fixed overflow for discrete palettes', () => {
    const colors = [
      [10, 20, 30],
      [40, 50, 60],
    ] as const;

    expect(color({ kind: 'discrete', colors, overflow: 'cycle' }, 3)).toEqual([40, 50, 60, 255]);
    expect(color({ kind: 'discrete', colors, overflow: { color: [70, 80, 90] } }, 3)).toEqual([
      70, 80, 90, 255,
    ]);
    expect(color({ kind: 'discrete', colors, overflow: 'cycle' }, Number.NaN)).toEqual([
      120, 120, 120, 255,
    ]);
    expect(color({ kind: 'discrete', colors, overflow: 'cycle' }, -1)).toEqual([
      120, 120, 120, 255,
    ]);
    expect(color({ kind: 'discrete', colors, overflow: 'cycle' }, 1.5)).toEqual([
      120, 120, 120, 255,
    ]);
    expect(
      color({ kind: 'discrete', colors, overflow: { color: [70, 80, 90] } }, Number.NaN)
    ).toEqual([70, 80, 90, 255]);
    expect(regionColor(Number.NaN)).toEqual([120, 120, 120]);
  });

  it('rejects invalid colors, stops and empty discrete palettes', () => {
    expect(() => validatePalette({ kind: 'solid', color: [0, -1, 0] })).toThrow('0..255 range');
    expect(() => validatePalette({ kind: 'ramp', stops: [] })).toThrow('at least two stops');
    expect(() =>
      validatePalette({
        kind: 'ramp',
        stops: [
          { at: 1, color: [0, 0, 0] },
          { at: 1, color: [255, 255, 255] },
        ],
      })
    ).toThrow('strictly increasing');
    expect(() => validatePalette({ kind: 'discrete', colors: [], overflow: 'cycle' })).toThrow(
      'at least one color'
    );
  });
});

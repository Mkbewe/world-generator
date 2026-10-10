import { metersPerCssPixel, SCALE_BAR_MAX_PIXELS, scaleBarSegment } from './scale-bar';
import type { WorldDimensions } from '../../../utils/world-dimensions';

const DIMENSIONS: WorldDimensions = {
  widthMeters: 1000,
  heightMeters: 1000,
  sampleWidth: 100,
  sampleHeight: 100,
};

describe('metersPerCssPixel', () => {
  it('uses the renderer projection at the fitted zoom', () => {
    const meters = metersPerCssPixel(1, DIMENSIONS, 400, 400);

    expect(meters).toBeCloseTo(10 / 3.92, 6);
  });

  it('halves the distance when the zoom doubles', () => {
    const fitted = metersPerCssPixel(1, DIMENSIONS, 400, 400) ?? 0;
    const zoomed = metersPerCssPixel(2, DIMENSIONS, 400, 400) ?? 0;

    expect(zoomed).toBeCloseTo(fitted / 2, 6);
  });

  it('rejects an unmeasurable or invalid view', () => {
    expect(metersPerCssPixel(1, DIMENSIONS, 0, 0)).toBeUndefined();
    expect(metersPerCssPixel(0, DIMENSIONS, 400, 400)).toBeUndefined();
  });
});

describe('scaleBarSegment', () => {
  it('snaps to a round distance near the maximum bar width', () => {
    const segment = scaleBarSegment(2.551, 110);

    expect(segment?.label).toBe('200 m');
    expect(segment?.pixels).toBeCloseTo(78.4, 2);
  });

  it('keeps the bar inside the width budget at every zoom', () => {
    for (const metersPerPixel of [0.05, 0.5, 2.551, 10, 25, 130]) {
      const segment = scaleBarSegment(metersPerPixel);
      expect(segment, `${metersPerPixel} m/px`).toBeDefined();
      expect(segment?.pixels ?? Infinity).toBeLessThanOrEqual(SCALE_BAR_MAX_PIXELS + 1e-9);
      expect(segment?.pixels ?? 0).toBeGreaterThan(SCALE_BAR_MAX_PIXELS / 2.5);
    }
  });

  it('labels kilometres from one thousand metres', () => {
    expect(scaleBarSegment(10, 100)?.label).toBe('1 km');
    expect(scaleBarSegment(25, 100)?.label).toBe('2 km');
    expect(scaleBarSegment(0.5, 100)?.label).toBe('50 m');
  });

  it('rejects a broken distance', () => {
    expect(scaleBarSegment(0)).toBeUndefined();
    expect(scaleBarSegment(Number.NaN)).toBeUndefined();
    expect(scaleBarSegment(1, 0)).toBeUndefined();
  });
});

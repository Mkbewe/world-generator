import type { Measurement } from '@readout';
import type { ViewTransform } from '@renderer';

import {
  calculateMeasurementGeometry,
  LABEL_OFFSET,
  normalOf,
  rulerTicks,
  SEGMENT_LABEL_OFFSET,
  TICK_HALF,
} from './measure-geometry';
import type { WorldDimensions } from '../../../../../utils/world-dimensions';

const DIMENSIONS: WorldDimensions = {
  widthMeters: 1000,
  heightMeters: 1000,
  sampleWidth: 100,
  sampleHeight: 100,
};

const VIEW: ViewTransform = { scale: 1, centerX: 0.5, centerY: 0.5 };

function expectDefined<T>(value: T | undefined, message: string): T {
  expect(value).toBeDefined();
  if (value === undefined) {
    throw new Error(message);
  }
  return value;
}

describe('measure-geometry', () => {
  describe('normalOf', () => {
    it('returns a vertical fallback for a zero-length segment', () => {
      const normal = normalOf({ x: 10, y: 20 }, { x: 10, y: 20 });
      expect(normal).toEqual({ x: 0, y: -1 });
    });

    it('returns the unit normal for orthogonal and diagonal vectors', () => {
      const horizontal = normalOf({ x: 0, y: 0 }, { x: 10, y: 0 });
      expect(horizontal.x).toBeCloseTo(0);
      expect(horizontal.y).toBeCloseTo(-1);

      const vertical = normalOf({ x: 0, y: 0 }, { x: 0, y: 10 });
      expect(vertical.x).toBeCloseTo(1);
      expect(vertical.y).toBeCloseTo(0);

      const diagonal = normalOf({ x: 0, y: 0 }, { x: 10, y: 10 });
      const length = Math.hypot(diagonal.x, diagonal.y);
      expect(length).toBeCloseTo(1);
      expect(diagonal.x).toBeCloseTo(Math.SQRT1_2);
      expect(diagonal.y).toBeCloseTo(-Math.SQRT1_2);
    });
  });

  describe('rulerTicks', () => {
    it('returns empty array when length is zero', () => {
      expect(rulerTicks({ x: 5, y: 5 }, { x: 5, y: 5 }, 1)).toEqual([]);
    });

    it('returns empty array for invalid or non-positive metersPerPixel', () => {
      const start = { x: 0, y: 0 };
      const end = { x: 100, y: 0 };
      expect(rulerTicks(start, end, 0)).toEqual([]);
      expect(rulerTicks(start, end, -5)).toEqual([]);
      expect(rulerTicks(start, end, Number.NaN)).toEqual([]);
      expect(rulerTicks(start, end, Number.POSITIVE_INFINITY)).toEqual([]);
    });

    it('places ticks perpendicularly across the segment', () => {
      const start = { x: 0, y: 0 };
      const end = { x: 200, y: 0 };
      // 1 meter per pixel, TICK_TARGET_PIXELS = 60 -> roundDistance(60) = 50 -> stepPixels = 50
      const ticks = rulerTicks(start, end, 1);
      expect(ticks.length).toBeGreaterThan(0);

      for (const tick of ticks) {
        // Horizontal line -> ticks are vertical: x1 === x2, and y spans -TICK_HALF to +TICK_HALF
        expect(tick.x1).toBeCloseTo(tick.x2);
        expect(Math.abs(tick.y1 - tick.y2)).toBeCloseTo(TICK_HALF * 2);
      }
    });
  });

  describe('calculateMeasurementGeometry', () => {
    it('returns undefined when measurement is absent or has no points', () => {
      expect(
        calculateMeasurementGeometry({
          viewTransform: VIEW,
          dimensions: DIMENSIONS,
          containerWidth: 400,
          containerHeight: 400,
        })
      ).toBeUndefined();

      expect(
        calculateMeasurementGeometry({
          measurement: { points: [] },
          viewTransform: VIEW,
          dimensions: DIMENSIONS,
          containerWidth: 400,
          containerHeight: 400,
        })
      ).toBeUndefined();
    });

    it('returns undefined when container size or view scale is invalid', () => {
      const measurement: Measurement = {
        points: [{ x: 50, y: 50, u: 0.5, v: 0.5 }],
      };

      expect(
        calculateMeasurementGeometry({
          measurement,
          viewTransform: VIEW,
          dimensions: DIMENSIONS,
          containerWidth: 0,
          containerHeight: 400,
        })
      ).toBeUndefined();

      expect(
        calculateMeasurementGeometry({
          measurement,
          viewTransform: VIEW,
          dimensions: DIMENSIONS,
          containerWidth: 400,
          containerHeight: -10,
        })
      ).toBeUndefined();

      expect(
        calculateMeasurementGeometry({
          measurement,
          viewTransform: { scale: 0, centerX: 0.5, centerY: 0.5 },
          dimensions: DIMENSIONS,
          containerWidth: 400,
          containerHeight: 400,
        })
      ).toBeUndefined();

      expect(
        calculateMeasurementGeometry({
          measurement,
          viewTransform: { scale: -1, centerX: 0.5, centerY: 0.5 },
          dimensions: DIMENSIONS,
          containerWidth: 400,
          containerHeight: 400,
        })
      ).toBeUndefined();
    });

    it('calculates single-point measurement with start label and no segments', () => {
      const measurement: Measurement = {
        points: [{ x: 25, y: 50, u: 0.25, v: 0.5 }],
      };
      const geometry = expectDefined(
        calculateMeasurementGeometry({
          measurement,
          viewTransform: VIEW,
          dimensions: DIMENSIONS,
          containerWidth: 400,
          containerHeight: 400,
        }),
        'Expected measurement geometry'
      );

      expect(geometry.points).toHaveLength(1);
      expect(geometry.segments).toHaveLength(0);
      expect(geometry.totalLabel).toBeUndefined();
      expect(geometry.startLabel.text).toBe('0 m');
      // When single point, fallback normal is { x: 0, y: -1 } -> startLabel at y - LABEL_OFFSET
      expect(geometry.startLabel.y).toBeCloseTo(geometry.points[0].y - LABEL_OFFSET);
    });

    it('calculates committed segments, ticks, segment labels, and total label', () => {
      const measurement: Measurement = {
        points: [
          { x: 25, y: 50, u: 0.25, v: 0.5 },
          { x: 75, y: 50, u: 0.75, v: 0.5 },
        ],
      };
      const geometry = expectDefined(
        calculateMeasurementGeometry({
          measurement,
          viewTransform: VIEW,
          dimensions: DIMENSIONS,
          containerWidth: 400,
          containerHeight: 400,
        }),
        'Expected measurement geometry'
      );

      expect(geometry.points).toHaveLength(2);
      expect(geometry.segments).toHaveLength(1);

      const segment = geometry.segments[0];
      expect(segment.preview).toBe(false);
      expect(segment.meters).toBe(500);
      expect(segment.label.text).toBe('500 m');
      expect(segment.ticks.length).toBeGreaterThan(0);

      // Check segment label offset along normal
      const midY = (segment.start.y + segment.end.y) / 2;
      // For horizontal line from left to right, normal is (0, -1)
      // y = midY - (-1) * SEGMENT_LABEL_OFFSET = midY + SEGMENT_LABEL_OFFSET
      expect(segment.label.y).toBeCloseTo(midY + SEGMENT_LABEL_OFFSET);

      const totalLabel = expectDefined(geometry.totalLabel, 'Expected total label');
      expect(totalLabel.text).toBe('500 m');
    });

    it('handles preview segment and keeps start label anchored to first committed segment', () => {
      const start = { x: 25, y: 50, u: 0.25, v: 0.5 };
      const middle = { x: 50, y: 50, u: 0.5, v: 0.5 };
      const preview1 = { x: 75, y: 25, u: 0.75, v: 0.25 };
      const preview2 = { x: 50, y: 75, u: 0.5, v: 0.75 };

      const geom1 = expectDefined(
        calculateMeasurementGeometry({
          measurement: { points: [start, middle], preview: preview1 },
          viewTransform: VIEW,
          dimensions: DIMENSIONS,
          containerWidth: 400,
          containerHeight: 400,
        }),
        'Expected first measurement geometry'
      );

      const geom2 = expectDefined(
        calculateMeasurementGeometry({
          measurement: { points: [start, middle], preview: preview2 },
          viewTransform: VIEW,
          dimensions: DIMENSIONS,
          containerWidth: 400,
          containerHeight: 400,
        }),
        'Expected second measurement geometry'
      );

      expect(geom1.previewPoint).toBeDefined();
      expect(geom1.segments).toHaveLength(2);
      expect(geom1.segments[0].preview).toBe(false);
      expect(geom1.segments[1].preview).toBe(true);

      // Start label coordinates must be identical regardless of how the preview turns
      expect(geom1.startLabel.x).toBeCloseTo(geom2.startLabel.x);
      expect(geom1.startLabel.y).toBeCloseTo(geom2.startLabel.y);
    });
  });
});

import { pinMarkerPoint } from './pin-geometry';

const VIEW = { scale: 1, centerX: 0.5, centerY: 0.5 };
const DIMENSIONS = {
  widthMeters: 4000,
  heightMeters: 4000,
  sampleWidth: 4,
  sampleHeight: 4,
};
const POSITION = { x: 1, y: 2, u: 0.25, v: 0.5 };

function markerPoint(
  overrides: Partial<Parameters<typeof pinMarkerPoint>[0]> = {}
): ReturnType<typeof pinMarkerPoint> {
  return pinMarkerPoint({
    position: POSITION,
    viewTransform: VIEW,
    dimensions: DIMENSIONS,
    containerWidth: 400,
    containerHeight: 400,
    ...overrides,
  });
}

describe('pinMarkerPoint', () => {
  it('places the marker in the frame used by the measurement overlay', () => {
    expect(markerPoint()).toEqual({ x: 102, y: 200 });
  });

  it('follows zoom and pan', () => {
    const zoomed = markerPoint({ viewTransform: { scale: 2, centerX: 0.5, centerY: 0.5 } });
    const panned = markerPoint({ viewTransform: { scale: 2, centerX: 0.4, centerY: 0.5 } });

    expect(zoomed?.x).toBeCloseTo(4);
    expect(zoomed?.y).toBeCloseTo(200);
    expect(panned?.x).toBeCloseTo(82.4);
    expect(panned?.y).toBeCloseTo(200);
  });

  it('stays hidden without a pinned sample, dimensions or a measurable area', () => {
    expect(markerPoint({ position: undefined })).toBeUndefined();
    expect(markerPoint({ dimensions: undefined })).toBeUndefined();
    expect(markerPoint({ containerWidth: 0 })).toBeUndefined();
  });
});

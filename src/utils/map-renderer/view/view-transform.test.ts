import {
  canvasToCell,
  cellToCanvas,
  fitView,
  isFitted,
  MAX_VIEW_SCALE,
  nextZoomScale,
  panBy,
  previousZoomScale,
  project,
  withScale,
  zoomAt,
} from './view-transform';

const SIZE = { width: 100, height: 100 };
const SQUARE = { width: 400, height: 400 };
const WIDE = { width: 800, height: 400 };

describe('view transform', () => {
  it('fits the map into a square canvas', () => {
    const view = fitView();
    const projection = project(view, SQUARE, SIZE);

    expect(isFitted(view)).toBe(true);
    expect(projection).toEqual({ cellSize: 4, left: 0, top: 0, width: 400, height: 400 });
    expect(canvasToCell(projection, 200, 200)).toEqual({ x: 50, y: 50 });
    expect(cellToCanvas(projection, 25, 75)).toEqual({ x: 100, y: 300 });
  });

  it('letterboxes the map on a wider canvas and reveals more of it when zoomed', () => {
    const fitted = project(fitView(), WIDE, SIZE);
    expect(fitted.left).toBe(200);
    expect(canvasToCell(fitted, 200, 200)).toEqual({ x: 0, y: 50 });
    expect(canvasToCell(fitted, 400, 200)).toEqual({ x: 50, y: 50 });

    const zoomed = project(withScale(fitView(), WIDE, SIZE, 2), WIDE, SIZE);
    expect(zoomed).toMatchObject({ left: 0, top: -200, width: 800, height: 800 });
  });

  it('anchors the zoom on the map cell under the cursor', () => {
    const view = zoomAt(fitView(), WIDE, SIZE, 300, 200, 4);

    expect(view.scale).toBe(4);
    expect(canvasToCell(project(view, WIDE, SIZE), 300, 200)).toEqual({ x: 25, y: 50 });
  });

  it('clamps the zoom to the configured range', () => {
    expect(zoomAt(fitView(), SQUARE, SIZE, 200, 200, 0.5).scale).toBe(1);
    expect(zoomAt(fitView(), SQUARE, SIZE, 200, 200, 100).scale).toBe(MAX_VIEW_SCALE);
  });

  it('locks the fitted map in place and clamps panning with an overscroll allowance', () => {
    expect(panBy(fitView(), SQUARE, SIZE, 50, 50)).toEqual(fitView());

    const zoomed = withScale(fitView(), SQUARE, SIZE, 2);
    expect(panBy(zoomed, SQUARE, SIZE, 10_000, 10_000).centerX).toBe(0.125);
    expect(panBy(zoomed, SQUARE, SIZE, -10_000, -10_000).centerX).toBe(0.875);
  });

  it('steps through the discrete zoom levels', () => {
    expect(nextZoomScale(1)).toBe(2);
    expect(nextZoomScale(2)).toBe(4);
    expect(nextZoomScale(4)).toBe(MAX_VIEW_SCALE);
    expect(previousZoomScale(4)).toBe(2);
    expect(previousZoomScale(2)).toBe(1);
    expect(previousZoomScale(1)).toBe(1);
  });

  it('sets an exact scale keeping the map centre', () => {
    const panned = panBy(withScale(fitView(), SQUARE, SIZE, 2), SQUARE, SIZE, -100, -100);

    expect(withScale(panned, SQUARE, SIZE, 4)).toEqual({
      scale: 4,
      centerX: 0.625,
      centerY: 0.625,
    });
  });
});

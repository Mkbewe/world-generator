import { regionBorderSegments, strokeRegionBorders } from './region-preview-border';

describe('region fallback borders', () => {
  it('keeps the border at a fixed screen width when the world projection zooms', () => {
    const segments = regionBorderSegments(new Int16Array([0, 1, 0, 1]), 2, 2, {
      width: 101,
      height: 101,
    });
    const moveTo = vi.fn();
    const lineTo = vi.fn();
    const context = {
      save: vi.fn(),
      restore: vi.fn(),
      beginPath: vi.fn(),
      moveTo,
      lineTo,
      stroke: vi.fn(),
      lineWidth: 0,
    } as unknown as CanvasRenderingContext2D;

    strokeRegionBorders(context, segments, {
      cellSize: 2,
      left: 10,
      top: 20,
      width: 202,
      height: 202,
    });
    expect(context.lineWidth).toBe(5);
    expect(moveTo).toHaveBeenCalledWith(111, -79);
    expect(lineTo).toHaveBeenCalledWith(111, 121);

    strokeRegionBorders(context, segments, {
      cellSize: 4,
      left: 10,
      top: 20,
      width: 404,
      height: 404,
    });
    expect(context.lineWidth).toBe(5);
    expect(moveTo).toHaveBeenCalledWith(212, -178);
  });
});

import { presentationSize, renderSize, renderTarget, targetKey, viewTarget } from './index';
import { fitView, project } from '../view/view-transform';

const SIZE = { width: 100, height: 100 };
const MEASURED = { width: 8, height: 8, devicePixelRatio: 1 };

describe('preview targets', () => {
  it('caps the pixel ratio and falls back to the raster before measurement', () => {
    expect(presentationSize(undefined, SIZE)).toEqual({ width: 100, height: 100 });
    expect(presentationSize({ width: 10, height: 5, devicePixelRatio: 3 }, SIZE)).toEqual({
      width: 20,
      height: 10,
    });
  });

  it('extends the layer buffer with a margin at the presentation scale', () => {
    const display = viewTarget(fitView(), SIZE, MEASURED);
    const render = renderTarget(fitView(), SIZE, MEASURED);

    expect(render?.width).toBe(12);
    expect(render?.height).toBe(12);
    expect(render?.projection.cellSize).toBe(display?.projection.cellSize);
    expect(render?.projection.left).toBe((display?.projection.left ?? 0) + 2);
    expect(render?.projection.top).toBe((display?.projection.top ?? 0) + 2);
  });

  it('covers the whole viewport for a panned, magnified view', () => {
    const size = { width: 8, height: 8 };
    const view = { scale: 4, centerX: 0.75, centerY: 0.25 };
    const display = viewTarget(view, size, MEASURED);
    const render = renderTarget(view, size, MEASURED);

    expect(render).toMatchObject({ width: 12, height: 12 });
    expect(render?.projection.cellSize).toBeCloseTo(3.2);
    expect(render?.projection.left).toBeCloseTo(-13.2);
    expect(render?.projection.top).toBeCloseTo(-0.4);
    if (!display || !render) {
      throw new Error('Expected measured render targets.');
    }
    const scale = display.projection.cellSize / render.projection.cellSize;
    const left = display.projection.left - render.projection.left * scale;
    const top = display.projection.top - render.projection.top * scale;

    expect(left).toBeCloseTo(-2);
    expect(top).toBeCloseTo(-2);
    expect(left + render.width * scale).toBeCloseTo(10);
    expect(top + render.height * scale).toBeCloseTo(10);
  });

  it('renders magnified views at display resolution', () => {
    const target = renderTarget(
      { scale: 4, centerX: 0.5, centerY: 0.5 },
      { width: 4, height: 4 },
      MEASURED
    );

    expect(target).toMatchObject({ width: 12, height: 12 });
    expect(target?.projection.cellSize).toBe(6.4);
  });

  it('does not overscan before the first measurement', () => {
    expect(renderSize(undefined, SIZE)).toEqual({ width: 100, height: 100 });
  });

  it('keys targets by size and projection', () => {
    const base = {
      width: 8,
      height: 8,
      projection: project(fitView(), { width: 8, height: 8 }, SIZE),
    };

    expect(targetKey({ ...base, projection: { ...base.projection } })).toBe(targetKey(base));
    expect(targetKey({ ...base, width: 9 })).not.toBe(targetKey(base));
  });
});

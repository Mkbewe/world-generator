import type { LayerTile } from './layer';
import { paintProgressive } from './progressive-paint';
import type { RenderTarget } from '../preview-targets';

const target: RenderTarget = {
  width: 5,
  height: 3,
  projection: { cellSize: 1, left: 0, top: 0, width: 5, height: 3 },
};

describe('paintProgressive', () => {
  it('visits every tile in row-major order and reports its size', async () => {
    const painted: LayerTile[] = [];
    const reported: LayerTile[] = [];
    const measured: LayerTile[] = [];

    await paintProgressive({
      signal: new AbortController().signal,
      target,
      columns: 2,
      rows: 2,
      paint: tile => painted.push(tile),
      onTile: (x, y, width, height) => reported.push({ x, y, width, height }),
      onPainted: tile => measured.push(tile),
    });

    expect(painted).toEqual([
      { x: 0, y: 0, width: 3, height: 2 },
      { x: 3, y: 0, width: 2, height: 2 },
      { x: 0, y: 2, width: 3, height: 1 },
      { x: 3, y: 2, width: 2, height: 1 },
    ]);
    expect(reported).toEqual(painted);
    expect(measured).toEqual(painted);
  });

  it('stops before painting the next tile after an abort', async () => {
    const controller = new AbortController();
    const painted: LayerTile[] = [];

    await expect(
      paintProgressive({
        signal: controller.signal,
        target,
        columns: 2,
        rows: 2,
        paint: tile => {
          painted.push(tile);
          controller.abort();
        },
      })
    ).rejects.toMatchObject({ name: 'AbortError' });

    expect(painted).toHaveLength(1);
  });
});

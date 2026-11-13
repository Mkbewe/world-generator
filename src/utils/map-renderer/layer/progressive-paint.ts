import { yieldToBrowser } from './geology/geology-yield';
import type { LayerTile, TileReporter } from './layer';
import type { RenderTarget } from '../preview-targets';

export interface ProgressivePaintOptions {
  readonly signal: AbortSignal;
  readonly target: RenderTarget;
  readonly columns: number;
  readonly rows: number;
  readonly onTile?: TileReporter;
  readonly paint: (tile: LayerTile) => void;
  readonly onPainted?: (tile: LayerTile, durationMs: number) => void;
}

export async function paintProgressive(options: ProgressivePaintOptions): Promise<void> {
  const { signal, target, columns, rows, onTile, paint, onPainted } = options;
  const tileWidth = Math.ceil(target.width / columns);
  const tileHeight = Math.ceil(target.height / rows);

  for (let top = 0; top < target.height; top += tileHeight) {
    const height = Math.min(tileHeight, target.height - top);
    const lastRow = top + height >= target.height;
    for (let left = 0; left < target.width; left += tileWidth) {
      signal.throwIfAborted();
      const width = Math.min(tileWidth, target.width - left);
      const tile = { x: left, y: top, width, height };
      const startedAt = performance.now();
      paint(tile);
      onTile?.(tile.x, tile.y, tile.width, tile.height);
      onPainted?.(tile, performance.now() - startedAt);
      if (!lastRow || left + width < target.width) {
        await yieldToBrowser();
      }
    }
  }
}

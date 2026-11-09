import type { MapProjection } from './view-transform';
import type { MapSize } from '../layer';

/** Maps one canvas pixel to its source-cell index, or -1 when outside the map. */
export function cellAtPixel(
  projection: MapProjection,
  size: MapSize,
  pixelX: number,
  pixelY: number
): number {
  const x = Math.floor((pixelX + 0.5 - projection.left) / projection.cellSize);
  const y = Math.floor((pixelY + 0.5 - projection.top) / projection.cellSize);
  return x >= 0 && x < size.width && y >= 0 && y < size.height ? y * size.width + x : -1;
}

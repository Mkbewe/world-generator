import { REGION_GUTTER_HALF_WIDTH_PX } from './region-preview-raster';
import type { MapProjection } from '../../view/view-transform';
import type { MapSize } from '../layer';

/** Raster cell boundaries, retained as map coordinates for a fixed-width screen stroke. */
export function regionBorderSegments(
  owners: Int16Array,
  rasterWidth: number,
  rasterHeight: number,
  mapSize: MapSize,
  onlyOwner?: number
): Float64Array {
  const segments: number[] = [];
  for (let y = 0; y < rasterHeight; y++) {
    for (let x = 0; x < rasterWidth; x++) {
      const index = y * rasterWidth + x;
      const owner = owners[index];
      if (owner < 0 || (onlyOwner !== undefined && owner !== onlyOwner)) {
        continue;
      }
      if (x + 1 < rasterWidth && owners[index + 1] !== owner) {
        const borderX = edgeToMap(x + 1, rasterWidth, mapSize.width);
        segments.push(
          borderX,
          edgeToMap(y, rasterHeight, mapSize.height),
          borderX,
          edgeToMap(y + 1, rasterHeight, mapSize.height)
        );
      }
      if (y + 1 < rasterHeight && owners[index + rasterWidth] !== owner) {
        const borderY = edgeToMap(y + 1, rasterHeight, mapSize.height);
        segments.push(
          edgeToMap(x, rasterWidth, mapSize.width),
          borderY,
          edgeToMap(x + 1, rasterWidth, mapSize.width),
          borderY
        );
      }
    }
  }
  return Float64Array.from(segments);
}

export interface RegionStrokeOptions {
  readonly color?: string;
  readonly lineWidthPx?: number;
}

/** Draws raster cell boundaries in presentation pixels, not source pixels. */
export function strokeRegionBorders(
  context: CanvasRenderingContext2D,
  segments: Float64Array,
  projection: MapProjection,
  options: RegionStrokeOptions = {}
): void {
  if (segments.length === 0) {
    return;
  }
  context.save();
  context.strokeStyle = options.color ?? '#fff';
  context.lineWidth = options.lineWidthPx ?? REGION_GUTTER_HALF_WIDTH_PX * 2;
  context.lineCap = 'round';
  context.lineJoin = 'round';
  context.beginPath();
  for (let index = 0; index < segments.length; index += 4) {
    context.moveTo(
      projection.left + segments[index] * projection.cellSize,
      projection.top + segments[index + 1] * projection.cellSize
    );
    context.lineTo(
      projection.left + segments[index + 2] * projection.cellSize,
      projection.top + segments[index + 3] * projection.cellSize
    );
  }
  context.stroke();
  context.restore();
}

function edgeToMap(edge: number, rasterLength: number, mapLength: number): number {
  if (rasterLength <= 1) {
    return edge === 0 ? 0.5 : mapLength - 0.5;
  }
  return 0.5 + ((edge - 0.5) * (mapLength - 1)) / (rasterLength - 1);
}

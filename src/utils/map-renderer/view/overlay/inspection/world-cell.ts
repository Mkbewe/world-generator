import type { MapSize } from '@renderer/layer';

/** Whether the map cell lies inside the world mask stored with the rasters. */
export function isInsideWorld(value: unknown, index: number): boolean {
  return value instanceof Uint8Array && value[index] === 1;
}

/** Flat raster index of a cell, or undefined when the cell is outside the map. */
export function cellIndexAt(
  mapSize: MapSize | undefined,
  x: number,
  y: number
): number | undefined {
  if (!mapSize || x < 0 || y < 0 || x >= mapSize.width || y >= mapSize.height) {
    return undefined;
  }
  return y * mapSize.width + x;
}

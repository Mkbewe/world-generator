import { gridDistanceTransform } from '../../../grid-distance';
import { smoothstep } from '../../../math';
import type { MapProjection } from '../../view/view-transform';
import type { MapSize } from '../layer';

export const REGION_GUTTER_HALF_WIDTH_PX = 2.5;
const EDGE_FADE_PX = 1.25;
/** Violet band just past the white border, measured in screen pixels. */
const HIGHLIGHT_INNER_PX = REGION_GUTTER_HALF_WIDTH_PX + EDGE_FADE_PX / 2;
const HIGHLIGHT_BAND_PX = 2.25;
const HIGHLIGHT_FADE_PX = 0.75;

/** Extend region ownership past the rasterized world edge before the smooth canvas clip. */
export function extendRegionOwners(owners: Int16Array, width: number, height: number): Int16Array {
  const extended = owners.slice();
  const queue = new Uint32Array(owners.length);
  let tail = 0;
  for (let index = 0; index < owners.length; index++) {
    if (owners[index] >= 0) {
      queue[tail++] = index;
    }
  }
  for (let head = 0; head < tail; head++) {
    const index = queue[head];
    const x = index % width;
    if (x > 0) {
      fill(index - 1, index);
    }
    if (x + 1 < width) {
      fill(index + 1, index);
    }
    if (index >= width) {
      fill(index - width, index);
    }
    if (index + width < width * height) {
      fill(index + width, index);
    }
  }
  return extended;

  function fill(index: number, source: number): void {
    if (extended[index] >= 0) {
      return;
    }
    extended[index] = extended[source];
    queue[tail++] = index;
  }
}

/** Distance from each region cell to a different region, in raster cells. */
export function regionBorderDistances(
  owners: Int16Array,
  width: number,
  height: number
): Float32Array {
  return gridDistanceTransform(owners, width, height, {
    borderDistance: 0.5,
    farDistance: width + height,
    stepX: 1,
    stepY: 1,
    diagonal: Math.SQRT2,
  });
}

export interface RegionTileInput {
  readonly owners: Int16Array;
  readonly distances: Float32Array;
  readonly rasterWidth: number;
  readonly rasterHeight: number;
  readonly colors: readonly (readonly [number, number, number])[];
  readonly mapSize: MapSize;
  readonly projection: MapProjection;
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
  readonly showGutters?: boolean;
  /** Region drawn with an accent band just inside its border. */
  readonly highlightOwner?: number;
  readonly highlightColor?: readonly [number, number, number];
}

/** Opaque white surface with antialiased region colours and gutters. */
export function paintRegionPixels(pixels: Uint8ClampedArray, input: RegionTileInput): void {
  const {
    owners,
    distances,
    rasterWidth,
    rasterHeight,
    colors,
    mapSize,
    projection,
    left,
    top,
    width,
    height,
    showGutters = true,
    highlightOwner = -1,
    highlightColor,
  } = input;
  const rasterPixelSize = Math.min(
    (mapSize.width * projection.cellSize) / rasterWidth,
    (mapSize.height * projection.cellSize) / rasterHeight
  );
  const rasterXs = new Float64Array(width);
  const cellXs = new Int32Array(width);
  for (let column = 0; column < width; column++) {
    const mapX = (left + column + 0.5 - projection.left) / projection.cellSize;
    if (mapX < 0 || mapX >= mapSize.width) {
      cellXs[column] = -1;
      continue;
    }
    const rasterX = (mapX - 0.5) * ((rasterWidth - 1) / Math.max(1, mapSize.width - 1)) + 0.5;
    rasterXs[column] = rasterX;
    cellXs[column] = Math.max(0, Math.min(rasterWidth - 1, Math.floor(rasterX)));
  }
  pixels.fill(255);
  for (let row = 0; row < height; row++) {
    const mapY = (top + row + 0.5 - projection.top) / projection.cellSize;
    if (mapY < 0 || mapY >= mapSize.height) {
      continue;
    }
    const rasterY = (mapY - 0.5) * ((rasterHeight - 1) / Math.max(1, mapSize.height - 1)) + 0.5;
    const cellY = Math.max(0, Math.min(rasterHeight - 1, Math.floor(rasterY)));
    for (let column = 0; column < width; column++) {
      const cellX = cellXs[column];
      if (cellX < 0) {
        continue;
      }
      const rasterX = rasterXs[column];
      const index = cellY * rasterWidth + cellX;
      const owner = owners[index];
      const color = colors[owner];
      if (!color) {
        continue;
      }
      const highlighted = highlightColor !== undefined && highlightOwner === owner;
      let coverage = 1;
      if (showGutters) {
        const distance = borderDistanceAt(
          owners,
          distances,
          rasterWidth,
          rasterHeight,
          cellX,
          cellY,
          rasterX,
          rasterY
        );
        coverage = smoothstep(
          (distance * rasterPixelSize - REGION_GUTTER_HALF_WIDTH_PX + EDGE_FADE_PX / 2) /
            EDGE_FADE_PX
        );
      }
      let red = Math.round(255 + (color[0] - 255) * coverage);
      let green = Math.round(255 + (color[1] - 255) * coverage);
      let blue = Math.round(255 + (color[2] - 255) * coverage);
      if (highlighted) {
        // The smooth field keeps the band steady at every zoom; the pixel
        // metrics place it just past the white border, inside the region.
        const distancePx =
          bilinearDistance(distances, rasterWidth, rasterHeight, rasterX - 0.5, rasterY - 0.5) *
          rasterPixelSize;
        const accent =
          smoothstep((distancePx - HIGHLIGHT_INNER_PX) / HIGHLIGHT_FADE_PX) *
          (1 -
            smoothstep((distancePx - HIGHLIGHT_INNER_PX - HIGHLIGHT_BAND_PX) / HIGHLIGHT_FADE_PX));
        red = Math.round(red + (highlightColor[0] - red) * accent);
        green = Math.round(green + (highlightColor[1] - green) * accent);
        blue = Math.round(blue + (highlightColor[2] - blue) * accent);
      }
      const offset = (row * width + column) * 4;
      pixels[offset] = red;
      pixels[offset + 1] = green;
      pixels[offset + 2] = blue;
    }
  }
}

function borderDistanceAt(
  owners: Int16Array,
  distances: Float32Array,
  width: number,
  height: number,
  x: number,
  y: number,
  rasterX: number,
  rasterY: number
): number {
  const index = y * width + x;
  const owner = owners[index];
  let distance = bilinearDistance(distances, width, height, rasterX - 0.5, rasterY - 0.5);
  if (x > 0 && differentOwner(owner, owners[index - 1])) {
    distance = Math.min(distance, rasterX - x);
  }
  if (x + 1 < width && differentOwner(owner, owners[index + 1])) {
    distance = Math.min(distance, x + 1 - rasterX);
  }
  if (y > 0 && differentOwner(owner, owners[index - width])) {
    distance = Math.min(distance, rasterY - y);
  }
  if (y + 1 < height && differentOwner(owner, owners[index + width])) {
    distance = Math.min(distance, y + 1 - rasterY);
  }
  return distance;
}

function bilinearDistance(
  distances: Float32Array,
  width: number,
  height: number,
  x: number,
  y: number
): number {
  const fromX = Math.max(0, Math.min(width - 1, Math.floor(x)));
  const fromY = Math.max(0, Math.min(height - 1, Math.floor(y)));
  const toX = Math.min(width - 1, fromX + 1);
  const toY = Math.min(height - 1, fromY + 1);
  const shareX = Math.max(0, Math.min(1, x - fromX));
  const shareY = Math.max(0, Math.min(1, y - fromY));
  const top =
    distances[fromY * width + fromX] * (1 - shareX) + distances[fromY * width + toX] * shareX;
  const bottom =
    distances[toY * width + fromX] * (1 - shareX) + distances[toY * width + toX] * shareX;
  return top * (1 - shareY) + bottom * shareY;
}

function differentOwner(owner: number, other: number | undefined): boolean {
  return other !== undefined && other >= 0 && other !== owner;
}

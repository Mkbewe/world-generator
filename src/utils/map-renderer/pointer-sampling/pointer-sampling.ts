import type { MapSize } from '../layer';
import { canvasToCell, type MapProjection } from '../view/view-transform';

/** Cell and map coordinates of a pointer position. */
export interface MapPointerSample {
  readonly x: number;
  readonly y: number;
  readonly u: number;
  readonly v: number;
}

/** Canvas point in device pixels of a client position. */
export function pointerAnchor(
  canvas: HTMLCanvasElement,
  clientX: number,
  clientY: number
): { x: number; y: number } | undefined {
  const rect = canvas.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) {
    return undefined;
  }
  return {
    x: (clientX - rect.left) * (canvas.width / rect.width),
    y: (clientY - rect.top) * (canvas.height / rect.height),
  };
}

/** Cell and map coordinates of a client point, or undefined outside the map. */
export function samplePointer(
  canvas: HTMLCanvasElement,
  size: MapSize,
  projection: MapProjection,
  clientX: number,
  clientY: number
): MapPointerSample | undefined {
  const anchor = pointerAnchor(canvas, clientX, clientY);
  if (!anchor) {
    return undefined;
  }
  const cell = canvasToCell(projection, anchor.x, anchor.y);
  if (cell.x < 0 || cell.x >= size.width || cell.y < 0 || cell.y >= size.height) {
    return undefined;
  }
  return {
    x: Math.floor(cell.x),
    y: Math.floor(cell.y),
    u: cell.x / size.width,
    v: cell.y / size.height,
  };
}

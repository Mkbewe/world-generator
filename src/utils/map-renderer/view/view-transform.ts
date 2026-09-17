import type { MapSize } from '../layer';

/**
 * Placement of the map inside the preview, in map units.
 *
 * `centerX`/`centerY` are the map coordinates (0..1) visible in the middle of
 * the preview and `scale` is the zoom relative to the fitted view, so the
 * transform is independent of the canvas pixels and the device ratio.
 */
export interface ViewTransform {
  readonly scale: number;
  readonly centerX: number;
  readonly centerY: number;
}

export interface CanvasSize {
  readonly width: number;
  readonly height: number;
}

/** Aspect-preserving placement of the map on the canvas. */
export interface MapProjection {
  /** Canvas pixels per cell, equal on both axes. */
  readonly cellSize: number;
  /** Canvas rectangle occupied by the whole map. */
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

export const MIN_VIEW_SCALE = 1;
export const MAX_VIEW_SCALE = 4;

/** Discrete zoom levels used by the view buttons. */
export const ZOOM_SCALE_STEPS = [1, 2, 4] as const;

export function fitView(): ViewTransform {
  return { scale: MIN_VIEW_SCALE, centerX: 0.5, centerY: 0.5 };
}

export function isFitted(view: ViewTransform): boolean {
  return view.scale === MIN_VIEW_SCALE;
}

export function nextZoomScale(scale: number): number {
  return ZOOM_SCALE_STEPS.find(step => step > scale) ?? MAX_VIEW_SCALE;
}

export function previousZoomScale(scale: number): number {
  return [...ZOOM_SCALE_STEPS].reverse().find(step => step < scale) ?? MIN_VIEW_SCALE;
}

/**
 * Fits the map into the canvas preserving its aspect ratio, so a wider canvas
 * shows empty space next to the map at 1x and more of the map once zoomed.
 */
export function project(view: ViewTransform, canvas: CanvasSize, size: MapSize): MapProjection {
  const base = Math.min(canvas.width / size.width, canvas.height / size.height);
  const cellSize = base * view.scale;
  const width = size.width * cellSize;
  const height = size.height * cellSize;
  return {
    cellSize,
    left: canvas.width / 2 - view.centerX * width,
    top: canvas.height / 2 - view.centerY * height,
    width,
    height,
  };
}

export function cellToCanvas(
  projection: MapProjection,
  cellX: number,
  cellY: number
): { x: number; y: number } {
  return {
    x: projection.left + cellX * projection.cellSize,
    y: projection.top + cellY * projection.cellSize,
  };
}

export function canvasToCell(
  projection: MapProjection,
  canvasX: number,
  canvasY: number
): { x: number; y: number } {
  return {
    x: (canvasX - projection.left) / projection.cellSize,
    y: (canvasY - projection.top) / projection.cellSize,
  };
}

/** Cell rectangle visible on the canvas, clamped to the map. */
export function visibleCells(
  projection: MapProjection,
  canvas: CanvasSize,
  size: MapSize
): { x: number; y: number; width: number; height: number } {
  const x0 = Math.max(0, (0 - projection.left) / projection.cellSize);
  const y0 = Math.max(0, (0 - projection.top) / projection.cellSize);
  const x1 = Math.min(size.width, (canvas.width - projection.left) / projection.cellSize);
  const y1 = Math.min(size.height, (canvas.height - projection.top) / projection.cellSize);
  return {
    x: x0,
    y: y0,
    width: Math.max(0, x1 - x0),
    height: Math.max(0, y1 - y0),
  };
}

/** Zooms around a canvas point, keeping the map cell under it in place. */
export function zoomAt(
  view: ViewTransform,
  canvas: CanvasSize,
  size: MapSize,
  anchorX: number,
  anchorY: number,
  factor: number
): ViewTransform {
  const scale = clamp(round4(view.scale * factor), MIN_VIEW_SCALE, MAX_VIEW_SCALE);
  if (scale === view.scale) {
    return view;
  }
  const anchor = canvasToCell(project(view, canvas, size), anchorX, anchorY);
  const span = mapSpan(scale, canvas, size);
  return clampView(
    {
      scale,
      centerX: anchor.x / size.width - (anchorX - canvas.width / 2) / span.width,
      centerY: anchor.y / size.height - (anchorY - canvas.height / 2) / span.height,
    },
    canvas,
    size
  );
}

/** Zooms to an exact scale around the preview centre. */
export function withScale(
  view: ViewTransform,
  canvas: CanvasSize,
  size: MapSize,
  scale: number
): ViewTransform {
  const clamped = clamp(round4(scale), MIN_VIEW_SCALE, MAX_VIEW_SCALE);
  if (clamped === view.scale) {
    return view;
  }
  return clampView({ ...view, scale: clamped }, canvas, size);
}

/** Moves the map by a canvas delta; the map always covers the canvas where it can. */
export function panBy(
  view: ViewTransform,
  canvas: CanvasSize,
  size: MapSize,
  deltaX: number,
  deltaY: number
): ViewTransform {
  const span = mapSpan(view.scale, canvas, size);
  return clampView(
    {
      scale: view.scale,
      centerX: view.centerX - deltaX / span.width,
      centerY: view.centerY - deltaY / span.height,
    },
    canvas,
    size
  );
}

function mapSpan(
  scale: number,
  canvas: CanvasSize,
  size: MapSize
): { width: number; height: number } {
  const base = Math.min(canvas.width / size.width, canvas.height / size.height);
  return { width: size.width * base * scale, height: size.height * base * scale };
}

/** Centres the map on the axis where it is smaller than the canvas. */
function clampView(view: ViewTransform, canvas: CanvasSize, size: MapSize): ViewTransform {
  const span = mapSpan(view.scale, canvas, size);
  const halfX = span.width > canvas.width ? canvas.width / 2 / span.width : 0.5;
  const halfY = span.height > canvas.height ? canvas.height / 2 / span.height : 0.5;
  return {
    scale: view.scale,
    centerX: clamp(view.centerX, halfX, 1 - halfX),
    centerY: clamp(view.centerY, halfY, 1 - halfY),
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function round4(value: number): number {
  return Math.round(value * 10_000) / 10_000;
}

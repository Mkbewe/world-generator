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

export const MIN_VIEW_SCALE = 0.5;
/** Default zoom of the fitted view; zooming out below it reveals the whole map. */
export const FIT_VIEW_SCALE = 1;
export const MAX_VIEW_SCALE = 4;

/** Extra pan beyond the map edge, as a fraction of the viewport per side. */
const PAN_OVERSCROLL = 0.25;

/** Discrete zoom levels used by the view buttons. */
export const ZOOM_SCALE_STEPS = [MIN_VIEW_SCALE, FIT_VIEW_SCALE, 2, MAX_VIEW_SCALE] as const;

export function fitView(): ViewTransform {
  return { scale: FIT_VIEW_SCALE, centerX: 0.5, centerY: 0.5 };
}

/** Whether the view is exactly the default fitted placement (zoom and centre). */
export function isFitted(view: ViewTransform): boolean {
  const fitted = fitView();
  return (
    view.scale === fitted.scale &&
    view.centerX === fitted.centerX &&
    view.centerY === fitted.centerY
  );
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
  const halfX = clampHalf(canvas.width, span.width);
  const halfY = clampHalf(canvas.height, span.height);
  return {
    scale: view.scale,
    centerX: clamp(view.centerX, halfX, 1 - halfX),
    centerY: clamp(view.centerY, halfY, 1 - halfY),
  };
}

/**
 * Smallest normalized centre that keeps the axis covered, minus a fixed pan
 * overscroll. The allowance does not depend on the zoom, so the map can be
 * nudged by the same viewport fraction also when it fits entirely.
 */
function clampHalf(canvasSize: number, spanSize: number): number {
  const covered = spanSize <= canvasSize ? 0.5 : canvasSize / 2 / spanSize;
  const allowance = (canvasSize * PAN_OVERSCROLL) / spanSize;
  return Math.max(0, covered - allowance);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function round4(value: number): number {
  return Math.round(value * 10_000) / 10_000;
}

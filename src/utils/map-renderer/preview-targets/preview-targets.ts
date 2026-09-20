import type { RenderTarget } from './render-target';
import type { MapSize } from '../layer';
import { type CanvasSize, project, type ViewTransform } from '../view/view-transform';
import { effectivePixelRatio, type ViewportSize } from '../viewport';

/** Layer buffers extend this far beyond the viewport per axis, so gestures have spare map. */
const RENDER_OVERSCAN = 1.5;

/** Presentation canvas size in device pixels, or the raster size before the first measurement. */
export function presentationSize(
  measured: ViewportSize | undefined,
  size: MapSize | undefined
): CanvasSize {
  if (!measured) {
    return { width: size?.width ?? 0, height: size?.height ?? 0 };
  }
  const ratio = effectivePixelRatio(measured.devicePixelRatio);
  return {
    width: Math.max(1, Math.round(measured.width * ratio)),
    height: Math.max(1, Math.round(measured.height * ratio)),
  };
}

/** Layer buffer size: the presentation size plus a margin, or the raster before measurement. */
export function renderSize(
  measured: ViewportSize | undefined,
  size: MapSize | undefined
): CanvasSize {
  if (!measured) {
    return presentationSize(measured, size);
  }
  const viewport = presentationSize(measured, size);
  return {
    width: Math.max(1, Math.round(viewport.width * RENDER_OVERSCAN)),
    height: Math.max(1, Math.round(viewport.height * RENDER_OVERSCAN)),
  };
}

/** Projection of the presentation canvas for the current view. */
export function viewTarget(
  view: ViewTransform,
  size: MapSize | undefined,
  measured: ViewportSize | undefined
): RenderTarget | undefined {
  if (!size) {
    return undefined;
  }
  const canvas = presentationSize(measured, size);
  return { ...canvas, projection: project(view, canvas, size) };
}

/**
 * Layer output buffer: display pixels plus a gesture margin. Every layer paints
 * in screen resolution, also when magnified, so continuous edges stay sharp.
 */
export function renderTarget(
  view: ViewTransform,
  size: MapSize | undefined,
  measured: ViewportSize | undefined
): RenderTarget | undefined {
  if (!size) {
    return undefined;
  }
  const viewport = presentationSize(measured, size);
  const projection = project(view, viewport, size);
  const canvas = renderSize(measured, size);

  return {
    ...canvas,
    projection: {
      ...projection,
      left: projection.left + (canvas.width - viewport.width) / 2,
      top: projection.top + (canvas.height - viewport.height) / 2,
    },
  };
}

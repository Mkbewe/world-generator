import type { WorldShape } from '../../world-shape';
import type { MapSize } from '../layer';
import { presentationPadding } from '../preview-targets';
import type { SpatialMask } from '../types';
import { type MapProjection, project, type ViewTransform } from '../view/view-transform';
import { effectivePixelRatio, type ViewportSize } from '../viewport';

const BOUNDARY_COLOR = 'rgba(49, 155, 0, 0.9)';
const BOUNDARY_LINE_WIDTH = 3;

/**
 * Eroded outline for content that must keep water to the world edge, e.g. the
 * landmass preview clipped by the ocean margin. `inset` shrinks the path in
 * canvas pixels per axis, mirroring the base outline above.
 */
export function traceErodedWorldBoundary(
  context: CanvasRenderingContext2D,
  projection: MapProjection,
  size: MapSize,
  shape: WorldShape,
  inset: { readonly x: number; readonly y: number }
): void {
  if (shape === 'disc') {
    context.ellipse(
      projection.left + projection.width / 2,
      projection.top + projection.height / 2,
      Math.max(0, ((size.width - 1) * projection.cellSize) / 2 - inset.x),
      Math.max(0, ((size.height - 1) * projection.cellSize) / 2 - inset.y),
      0,
      0,
      Math.PI * 2
    );
  } else {
    context.rect(
      projection.left + projection.cellSize / 2 + inset.x,
      projection.top + projection.cellSize / 2 + inset.y,
      Math.max(0, projection.width - projection.cellSize - inset.x * 2),
      Math.max(0, projection.height - projection.cellSize - inset.y * 2)
    );
  }
}
/**
 * Shared outline for the visible stroke and the presentation clip. `offset`
 * moves the path outward from the world, so a stroke drawn on it stays outside
 * the coloured fill while its inner side still follows the coloured edge.
 */
export function traceWorldBoundary(
  context: CanvasRenderingContext2D,
  projection: MapProjection,
  size: MapSize,
  shape: WorldShape,
  offset = 0
): void {
  if (shape === 'disc') {
    context.ellipse(
      projection.left + projection.width / 2,
      projection.top + projection.height / 2,
      Math.max(0, ((size.width - 1) * projection.cellSize) / 2 + offset),
      Math.max(0, ((size.height - 1) * projection.cellSize) / 2 + offset),
      0,
      0,
      Math.PI * 2
    );
  } else {
    context.rect(
      projection.left + projection.cellSize / 2 - offset,
      projection.top + projection.cellSize / 2 - offset,
      Math.max(0, projection.width - projection.cellSize + offset * 2),
      Math.max(0, projection.height - projection.cellSize + offset * 2)
    );
  }
}

export class WorldBoundaryRenderer {
  constructor(private readonly canvas: HTMLCanvasElement) {}

  clear(): void {
    this.canvas.width = this.canvas.height = 0;
  }

  render(world: SpatialMask, viewport: ViewportSize, shape: WorldShape, view: ViewTransform): void {
    const context = this.canvas.getContext('2d');
    if (!context) {
      throw new Error('Overlay canvas is not available.');
    }
    const ratio = effectivePixelRatio(viewport.devicePixelRatio);
    const width = Math.max(1, Math.round(viewport.width * ratio));
    const height = Math.max(1, Math.round(viewport.height * ratio));
    this.canvas.width = width;
    this.canvas.height = height;
    this.strokeShape(context, shape, width, height, ratio, view, world);
  }

  private strokeShape(
    context: CanvasRenderingContext2D,
    shape: WorldShape,
    width: number,
    height: number,
    ratio: number,
    view: ViewTransform,
    world: SpatialMask
  ): void {
    const lineWidth = BOUNDARY_LINE_WIDTH * ratio;
    const padding = presentationPadding({ width, height }, ratio);
    const projection = project(view, { width, height }, world.size, padding);

    context.strokeStyle = BOUNDARY_COLOR;
    context.lineWidth = lineWidth;
    context.beginPath();
    traceWorldBoundary(context, projection, world.size, shape, lineWidth / 2);
    context.stroke();
  }
}

import type { GeologicalRegionType } from '../../../map-generator/types';

/** Half-height of the anchor icon; three times the old dot radius. */
export const ANCHOR_ICON_SIZE_PX = 10.5;
export const TYPE_ICON_SIZE_PX = 20;
const LABEL_OUTLINE = 'rgba(15, 23, 42, 0.85)';

/**
 * One glyph per region type; every builder leaves a single path for the caller
 * to fill and outline. The record keeps the shape with the type instead of
 * branching at the call.
 */
const TYPE_ICONS: Readonly<
  Record<
    GeologicalRegionType,
    (context: CanvasRenderingContext2D, x: number, y: number, size: number) => void
  >
> = {
  /** Two rolling hills. */
  ordinary(context, x, y, size) {
    context.beginPath();
    context.moveTo(x - size, y + size * 0.75);
    context.quadraticCurveTo(x - size * 0.35, y - size * 1.9, x + size * 0.3, y + size * 0.75);
    context.closePath();
    context.moveTo(x - size * 0.35, y + size * 0.75);
    context.quadraticCurveTo(x + size * 0.35, y - size * 1.7, x + size, y + size * 0.75);
    context.closePath();
  },
  /** Volcano with a crater and a smoke puff. */
  volcanic(context, x, y, size) {
    context.beginPath();
    context.moveTo(x - size, y + size * 0.8);
    context.lineTo(x - size * 0.32, y - size * 0.7);
    context.lineTo(x - size * 0.12, y - size * 0.42);
    context.lineTo(x + size * 0.12, y - size * 0.42);
    context.lineTo(x + size * 0.32, y - size * 0.7);
    context.lineTo(x + size, y + size * 0.8);
    context.closePath();
    context.moveTo(x + size * 0.58, y - size * 0.95);
    context.arc(x + size * 0.42, y - size * 0.95, size * 0.16, 0, Math.PI * 2);
  },
  /** Reef ring with a pass and an islet on the reef. */
  atoll(context, x, y, size) {
    context.beginPath();
    context.arc(x, y, size * 0.85, 0.5, Math.PI * 2 - 0.2);
    context.arc(x, y, size * 0.42, Math.PI * 2 - 0.2, 0.5, true);
    context.closePath();
    context.moveTo(x + size * 0.6, y - size * 0.45);
    context.arc(x + size * 0.45, y - size * 0.45, size * 0.15, 0, Math.PI * 2);
  },
};

/** White type glyph with a dark outline, drawn at the centre of the region. */
export function paintTypeIcon(
  context: CanvasRenderingContext2D,
  type: GeologicalRegionType,
  x: number,
  y: number,
  size: number
): void {
  context.fillStyle = '#fff';
  context.strokeStyle = LABEL_OUTLINE;
  context.lineWidth = Math.max(1, size * 0.14);
  context.lineJoin = 'round';
  TYPE_ICONS[type](context, x, y, size);
  context.fill();
  context.stroke();
}

/** White anchor glyph with a dark outline and barbs, drawn at the region anchor. */
export function paintAnchor(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number
): void {
  const outline = (): void => {
    context.beginPath();
    context.arc(x, y - size * 0.62, size * 0.26, 0, Math.PI * 2);
    context.moveTo(x, y - size * 0.36);
    context.lineTo(x, y + size * 0.42);
    context.moveTo(x - size * 0.5, y - size * 0.12);
    context.lineTo(x + size * 0.5, y - size * 0.12);
    context.moveTo(x - size * 0.72, y + size * 0.2);
    context.quadraticCurveTo(x, y + size * 1.05, x + size * 0.72, y + size * 0.2);
    context.moveTo(x - size * 0.72, y + size * 0.2);
    context.lineTo(x - size * 0.9, y - size * 0.02);
    context.moveTo(x + size * 0.72, y + size * 0.2);
    context.lineTo(x + size * 0.9, y - size * 0.02);
  };
  context.lineCap = 'round';
  context.strokeStyle = LABEL_OUTLINE;
  context.lineWidth = size * 0.42;
  outline();
  context.stroke();
  context.strokeStyle = '#fff';
  context.lineWidth = size * 0.2;
  outline();
  context.stroke();
}

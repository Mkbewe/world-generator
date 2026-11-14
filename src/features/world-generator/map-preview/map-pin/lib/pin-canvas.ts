import type { PinMarkerPoint } from './pin-geometry';

export interface PinCanvasTheme {
  readonly marker: string;
  readonly background: string;
}

/** Draws the pinned location as a ring with a contrasting centre. */
export function drawPin(
  context: CanvasRenderingContext2D,
  point: PinMarkerPoint,
  theme: PinCanvasTheme
): void {
  context.save();
  context.fillStyle = theme.marker;
  context.strokeStyle = theme.background;
  context.lineWidth = 2;
  context.beginPath();
  context.arc(point.x, point.y, 6, 0, Math.PI * 2);
  context.fill();
  context.stroke();

  context.fillStyle = theme.background;
  context.beginPath();
  context.arc(point.x, point.y, 2, 0, Math.PI * 2);
  context.fill();
  context.restore();
}

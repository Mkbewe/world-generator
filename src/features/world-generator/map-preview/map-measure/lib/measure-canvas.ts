import type { MeasureLabel, MeasurementGeometry } from './measure-geometry';

export interface MeasureCanvasTheme {
  readonly line: string;
  readonly background: string;
  readonly text: string;
  readonly fontSize: string;
  readonly fontFamily: string;
  readonly fontWeight: string;
}

export function drawMeasurement(
  context: CanvasRenderingContext2D,
  geometry: MeasurementGeometry,
  theme: MeasureCanvasTheme
): void {
  context.save();
  drawSegments(context, geometry, theme);
  drawLabels(
    context,
    geometry.segments.map(segment => segment.label),
    theme
  );
  drawPoints(context, geometry, theme);
  const endLabels: MeasureLabel[] = [geometry.startLabel];
  if (geometry.totalLabel) {
    endLabels.push(geometry.totalLabel);
  }
  drawLabels(context, endLabels, theme);
  context.restore();
}

function drawSegments(
  context: CanvasRenderingContext2D,
  geometry: MeasurementGeometry,
  theme: MeasureCanvasTheme
): void {
  context.strokeStyle = theme.line;
  for (const segment of geometry.segments) {
    context.globalAlpha = segment.preview ? 0.7 : 1;
    context.lineWidth = 2;
    context.setLineDash(segment.preview ? [6, 4] : []);
    context.beginPath();
    context.moveTo(segment.start.x, segment.start.y);
    context.lineTo(segment.end.x, segment.end.y);
    context.stroke();
    context.globalAlpha = 1;

    context.lineWidth = 1.5;
    context.setLineDash([]);
    context.beginPath();
    for (const tick of segment.ticks) {
      context.moveTo(tick.x1, tick.y1);
      context.lineTo(tick.x2, tick.y2);
    }
    context.stroke();
  }
}

function drawLabels(
  context: CanvasRenderingContext2D,
  labels: readonly MeasureLabel[],
  theme: MeasureCanvasTheme
): void {
  context.font = `${theme.fontWeight} ${theme.fontSize} ${theme.fontFamily}`;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.lineJoin = 'round';
  context.lineWidth = 3;
  context.strokeStyle = theme.background;
  context.fillStyle = theme.text;
  for (const label of labels) {
    context.strokeText(label.text, label.x, label.y);
    context.fillText(label.text, label.x, label.y);
  }
}

function drawPoints(
  context: CanvasRenderingContext2D,
  geometry: MeasurementGeometry,
  theme: MeasureCanvasTheme
): void {
  context.fillStyle = theme.line;
  context.strokeStyle = theme.background;
  context.lineWidth = 1.5;
  context.setLineDash([]);
  for (const point of geometry.points) {
    drawCircle(context, point.x, point.y, 4);
  }
  if (geometry.previewPoint) {
    context.fillStyle = theme.background;
    context.strokeStyle = theme.line;
    drawCircle(context, geometry.previewPoint.x, geometry.previewPoint.y, 3);
  }
}

function drawCircle(context: CanvasRenderingContext2D, x: number, y: number, radius: number): void {
  context.beginPath();
  context.arc(x, y, radius, 0, Math.PI * 2);
  context.fill();
  context.stroke();
}

export interface Point2D {
  readonly x: number;
  readonly y: number;
}

export interface RingGeometry<Point extends Point2D = Point2D> {
  readonly kind: 'ring';
  readonly center: Point;
  readonly innerRadius: number;
  readonly outerRadius: number;
}

export interface BandGeometry {
  readonly kind: 'band';
  readonly axis: 'x' | 'y';
  readonly center: number;
  readonly width: number;
}

export type RingBandGeometry<Point extends Point2D = Point2D> = RingGeometry<Point> | BandGeometry;

export function containsGeometry<Point extends Point2D>(
  geometry: RingBandGeometry<Point>,
  point: Point,
  distance: (left: Point, right: Point) => number
): boolean {
  if (geometry.kind === 'ring') {
    const radius = distance(point, geometry.center);
    return radius >= geometry.innerRadius && radius <= geometry.outerRadius;
  }
  const axisValue = geometry.axis === 'x' ? point.x : point.y;
  return Math.abs(axisValue - geometry.center) <= geometry.width / 2;
}

export function distanceToGeometry<Point extends Point2D>(
  geometry: RingBandGeometry<Point>,
  point: Point,
  distance: (left: Point, right: Point) => number
): number {
  if (geometry.kind === 'ring') {
    const radius = distance(point, geometry.center);
    return Math.max(geometry.innerRadius - radius, radius - geometry.outerRadius, 0);
  }
  const axisValue = geometry.axis === 'x' ? point.x : point.y;
  return Math.max(Math.abs(axisValue - geometry.center) - geometry.width / 2, 0);
}

export function containsCoordinate(geometry: RingBandGeometry, coordinate: number): boolean {
  if (geometry.kind === 'ring') {
    return coordinate >= geometry.innerRadius && coordinate <= geometry.outerRadius;
  }
  return Math.abs(coordinate - geometry.center) <= geometry.width / 2;
}

export function distanceToCoordinate(geometry: RingBandGeometry, coordinate: number): number {
  if (geometry.kind === 'ring') {
    return Math.max(coordinate - geometry.outerRadius, geometry.innerRadius - coordinate, 0);
  }
  return Math.max(Math.abs(coordinate - geometry.center) - geometry.width / 2, 0);
}

export function validateGeometry(
  id: string,
  geometry: RingBandGeometry,
  label: string,
  normalized: (value: number) => boolean = isNormalized
): void {
  if (geometry.kind === 'ring') {
    if (!normalized(geometry.center.x) || !normalized(geometry.center.y)) {
      throw new RangeError(`${label} "${id}" center must be within 0..1.`);
    }
    if (
      !Number.isFinite(geometry.innerRadius) ||
      !Number.isFinite(geometry.outerRadius) ||
      !(geometry.innerRadius >= 0 && geometry.outerRadius > geometry.innerRadius)
    ) {
      throw new RangeError(`${label} "${id}" must have a valid radial range.`);
    }
    return;
  }

  if (geometry.axis !== 'x' && geometry.axis !== 'y') {
    throw new RangeError(`${label} "${id}" axis must be "x" or "y".`);
  }
  if (!normalized(geometry.center)) {
    throw new RangeError(`${label} "${id}" center must be within 0..1.`);
  }
  if (!(geometry.width > 0 && geometry.width <= 1)) {
    throw new RangeError(`${label} "${id}" width must be within 0..1.`);
  }
}

export function isNormalized(value: number): boolean {
  return Number.isFinite(value) && value >= 0 && value <= 1;
}

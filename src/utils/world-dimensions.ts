export interface WorldDimensions {
  readonly widthMeters: number;
  readonly heightMeters: number;
  readonly sampleWidth: number;
  readonly sampleHeight: number;
}

export interface MeterPoint {
  readonly xMeters: number;
  readonly yMeters: number;
}

export interface CellPoint {
  readonly x: number;
  readonly y: number;
}

export interface NormalizedPoint {
  readonly u: number;
  readonly v: number;
}

/** Cells above this count are rejected by both the UI and the generator. */
export const SAMPLE_BUDGET = 16_000_000;

export interface DimensionRequest {
  readonly widthMeters: number;
  readonly heightMeters: number;
  readonly metersPerSample: number;
}

/** Derives integer sample counts from the physical size and the requested detail. */
export function dimensionsFromMeters({
  widthMeters,
  heightMeters,
  metersPerSample: detail,
}: DimensionRequest): WorldDimensions {
  if (!Number.isFinite(widthMeters) || widthMeters <= 0) {
    throw new RangeError('World width in meters must be a positive number.');
  }
  if (!Number.isFinite(heightMeters) || heightMeters <= 0) {
    throw new RangeError('World height in meters must be a positive number.');
  }
  if (!Number.isFinite(detail) || detail <= 0) {
    throw new RangeError('Meters per sample must be a positive number.');
  }
  return {
    widthMeters,
    heightMeters,
    sampleWidth: Math.max(1, Math.round(widthMeters / detail)),
    sampleHeight: Math.max(1, Math.round(heightMeters / detail)),
  };
}

/** Rejects dimensions that are unusable or exceed the shared sample budget. */
export function validateDimensions(dimensions: WorldDimensions): void {
  const { widthMeters, heightMeters, sampleWidth, sampleHeight } = dimensions;
  if (!Number.isFinite(widthMeters) || widthMeters <= 0) {
    throw new RangeError('World width in meters must be a positive number.');
  }
  if (!Number.isFinite(heightMeters) || heightMeters <= 0) {
    throw new RangeError('World height in meters must be a positive number.');
  }
  if (!Number.isInteger(sampleWidth) || sampleWidth < 1) {
    throw new RangeError('Sample width must be a positive integer.');
  }
  if (!Number.isInteger(sampleHeight) || sampleHeight < 1) {
    throw new RangeError('Sample height must be a positive integer.');
  }
  if (sampleWidth * sampleHeight > SAMPLE_BUDGET) {
    throw new RangeError(`World exceeds the sample budget of ${SAMPLE_BUDGET} cells.`);
  }
}

export function metersPerSample(dimensions: WorldDimensions): {
  readonly x: number;
  readonly y: number;
} {
  return {
    x: dimensions.widthMeters / dimensions.sampleWidth,
    y: dimensions.heightMeters / dimensions.sampleHeight,
  };
}

/** Cell under a point in meters, clamped to the raster. */
export function metersToCell(
  dimensions: WorldDimensions,
  xMeters: number,
  yMeters: number
): CellPoint {
  return {
    x: clampCell(
      Math.floor((xMeters / dimensions.widthMeters) * dimensions.sampleWidth),
      dimensions.sampleWidth
    ),
    y: clampCell(
      Math.floor((yMeters / dimensions.heightMeters) * dimensions.sampleHeight),
      dimensions.sampleHeight
    ),
  };
}

/** Center of a cell in meters. */
export function cellCenterMeters(dimensions: WorldDimensions, x: number, y: number): MeterPoint {
  const perSample = metersPerSample(dimensions);
  return { xMeters: (x + 0.5) * perSample.x, yMeters: (y + 0.5) * perSample.y };
}

/** Lower-left corner of a cell in meters. */
export function cellOriginMeters(dimensions: WorldDimensions, x: number, y: number): MeterPoint {
  const perSample = metersPerSample(dimensions);
  return { xMeters: x * perSample.x, yMeters: y * perSample.y };
}

export function metersToNormalized(
  dimensions: WorldDimensions,
  xMeters: number,
  yMeters: number
): NormalizedPoint {
  return {
    u: clamp01(xMeters / dimensions.widthMeters),
    v: clamp01(yMeters / dimensions.heightMeters),
  };
}

export function normalizedToMeters(dimensions: WorldDimensions, u: number, v: number): MeterPoint {
  return { xMeters: u * dimensions.widthMeters, yMeters: v * dimensions.heightMeters };
}

export function normalizedToCell(dimensions: WorldDimensions, u: number, v: number): CellPoint {
  const meters = normalizedToMeters(dimensions, u, v);
  return metersToCell(dimensions, meters.xMeters, meters.yMeters);
}

function clampCell(value: number, samples: number): number {
  return Math.min(samples - 1, Math.max(0, value));
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

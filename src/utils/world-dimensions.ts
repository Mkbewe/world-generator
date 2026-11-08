export interface WorldDimensions {
  readonly widthMeters: number;
  readonly heightMeters: number;
  readonly sampleWidth: number;
  readonly sampleHeight: number;
}

/** Narrows dimensions captured with a map; malformed values cannot measure anything. */
export function isWorldDimensions(value: unknown): value is WorldDimensions {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const { widthMeters, heightMeters, sampleWidth, sampleHeight } = value as WorldDimensions;
  const numbers = [widthMeters, heightMeters, sampleWidth, sampleHeight];
  if (!numbers.every(entry => typeof entry === 'number' && Number.isFinite(entry))) {
    return false;
  }
  return widthMeters > 0 && heightMeters > 0 && sampleWidth >= 1 && sampleHeight >= 1;
}

/** Physical world side length in meters. */
export type WorldSize = number;

/** Supported world side lengths, in meters. */
export const MIN_WORLD_SIZE = 3000;
export const MAX_WORLD_SIZE = 12_000;

export interface MeterPoint {
  readonly xMeters: number;
  readonly yMeters: number;
}

/**
 * Bytes one full generator state copy holds per cell: the persistent rasters —
 * world mask 1 and macro region ids 1 — and the geology plan rasters — region
 * owner 2 and region border distance 4. The plan metadata is negligible next
 * to the rasters.
 */
export const BYTES_PER_SAMPLE = 8;

/**
 * Budget for the generator data across both threads, in bytes (decimal
 * megabytes): the worker state and the copy sent to the main thread. Working
 * value pending a real peak measurement; renderer canvases and GPU memory are
 * counted separately by the render statistics.
 */
export const MEMORY_BUDGET_BYTES = 864_000_000;

/** Cells above this count are rejected by both the UI and the generator. */
export const SAMPLE_BUDGET = Math.floor(MEMORY_BUDGET_BYTES / (BYTES_PER_SAMPLE * 2));

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

/** Lower-left corner of a cell in meters. */
export function cellOriginMeters(dimensions: WorldDimensions, x: number, y: number): MeterPoint {
  const perSample = metersPerSample(dimensions);
  return { xMeters: x * perSample.x, yMeters: y * perSample.y };
}

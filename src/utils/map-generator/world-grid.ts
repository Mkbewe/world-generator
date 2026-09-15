import {
  BYTES_PER_SAMPLE,
  dimensionsFromMeters,
  SAMPLE_BUDGET,
  type WorldDimensions,
} from '../world-dimensions';

export { BYTES_PER_SAMPLE } from '../world-dimensions';

export interface WorldGridSummary {
  /** Sample grid actually used, limited by the shared sample budget. */
  readonly dimensions: WorldDimensions;
  /** Effective detail in meters per sample after clamping. */
  readonly metersPerSample: number;
  readonly samples: number;
  readonly memoryBytes: number;
  /** True when the requested detail was reduced to fit the sample budget. */
  readonly clamped: boolean;
}

/** Derives the sample grid and its rough cost from the physical size and the requested detail. */
export function summarizeWorldGrid(sizeMeters: number, metersPerSample: number): WorldGridSummary {
  const requested = dimensionsFromMeters({
    widthMeters: sizeMeters,
    heightMeters: sizeMeters,
    metersPerSample,
  });
  const limit = Math.floor(Math.sqrt(SAMPLE_BUDGET));
  const sampleWidth = Math.min(requested.sampleWidth, limit);
  const sampleHeight = Math.min(requested.sampleHeight, limit);
  const dimensions: WorldDimensions = {
    widthMeters: sizeMeters,
    heightMeters: sizeMeters,
    sampleWidth,
    sampleHeight,
  };

  return {
    dimensions,
    metersPerSample: dimensions.widthMeters / sampleWidth,
    samples: sampleWidth * sampleHeight,
    memoryBytes: sampleWidth * sampleHeight * BYTES_PER_SAMPLE,
    clamped: sampleWidth !== requested.sampleWidth || sampleHeight !== requested.sampleHeight,
  };
}

import { validateGeologyConfig } from './config/geology-check';
import { createRegionPartition } from './partition/region-partition';
import { placePartitionMarkers } from './placement/partition-markers';
import type { WorldDimensions } from '../../../world-dimensions';
import type { WorldShape } from '../../../world-shape';
import type { RandomFactory } from '../../random';
import type { WorldSpace } from '../../space';
import type { GeologyPlan, HeatZoneClass, WorldPoint } from '../../types';

/** Marker placement share of the stage progress; the partition owns the rest. */
const PLACEMENT_PROGRESS = 0.25;

export interface GeologyPlanOptions {
  readonly worldMask: Uint8Array;
  readonly thermalAt: (point: WorldPoint) => HeatZoneClass;
  readonly geologyCoupling: number;
  readonly signal?: AbortSignal;
  readonly report?: (progress: number) => void;
}

/** Builds a seed-determined full-world region partition with no heights. */
export function buildGeologyPlan(
  config: unknown,
  random: RandomFactory,
  shape: WorldShape,
  dimensions: WorldDimensions,
  space: WorldSpace,
  options: GeologyPlanOptions
): GeologyPlan {
  validateGeologyConfig(config);
  const markers = placePartitionMarkers({
    regions: config.regions,
    evenness: config.layout.evenness,
    dimensions,
    shape,
    space,
    random,
    thermalAt: options.thermalAt,
    geologyCoupling: options.geologyCoupling,
    signal: options.signal,
    report: progress => options.report?.(progress * PLACEMENT_PROGRESS),
  });
  const partition = createRegionPartition({
    regions: markers,
    layout: config.layout,
    dimensions,
    shape,
    worldMask: options.worldMask,
    random,
    space,
    signal: options.signal,
    report: progress => options.report?.(PLACEMENT_PROGRESS + progress * (1 - PLACEMENT_PROGRESS)),
  });
  const { counts } = partition;
  const cellArea =
    (dimensions.widthMeters / dimensions.sampleWidth) *
    (dimensions.heightMeters / dimensions.sampleHeight);
  let worldCells = 0;
  for (const count of counts) {
    worldCells += count;
  }
  return {
    regions: markers.map((marker, index) => ({
      id: marker.id,
      type: marker.type,
      centre: marker.centre,
      thermal: options.thermalAt(marker.centre),
      weight: marker.weight,
      areaSquareMeters: (counts[index] ?? 0) * cellArea,
    })),
    regionRasterSize: { width: dimensions.sampleWidth, height: dimensions.sampleHeight },
    regionOwnerMap: partition.owner,
    regionBorderDistanceMap: partition.borderDistanceMeters,
    worldAreaSquareMeters: worldCells * cellArea,
  };
}

import type { WorldDimensions } from '../../../../world-dimensions';
import type { WorldShape } from '../../../../world-shape';
import type { RandomFactory } from '../../../random';
import type { WorldSpace } from '../../../space';
import type { GeologyLayoutConfig } from '../../../types';
import type { RegionMarker } from '../placement/partition-markers';

export interface RegionPartitionInput {
  readonly regions: readonly RegionMarker[];
  readonly layout: GeologyLayoutConfig;
  readonly dimensions: WorldDimensions;
  readonly shape: WorldShape;
  readonly random: RandomFactory;
  readonly space: WorldSpace;
  readonly signal?: AbortSignal;
  readonly report?: (progress: number) => void;
}

export interface RegionPartition {
  readonly owner: Int16Array;
  readonly counts: Uint32Array;
  readonly borderDistanceMeters: Float32Array;
}

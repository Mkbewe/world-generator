import type { RandomFactory } from '@generator/random';
import type { WorldSpace } from '@generator/space';
import type { GeologyLayoutConfig } from '@generator/types';

import type { WorldDimensions } from '../../../../world-dimensions';
import type { WorldShape } from '../../../../world-shape';
import type { RegionMarker } from '../placement/partition-markers';

export interface RegionPartitionInput {
  readonly regions: readonly RegionMarker[];
  readonly layout: GeologyLayoutConfig;
  readonly dimensions: WorldDimensions;
  readonly shape: WorldShape;
  readonly worldMask: Uint8Array;
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

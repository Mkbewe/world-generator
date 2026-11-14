import type { GenerationEvent, PipelineStageId, StageInfo } from '@generator';
import type { LayerDataRecord, MapInfo, MapRasters } from '@layers';

import type {
  WorldSnapshotData,
  WorldSnapshotDimensionsMeters,
  WorldSnapshotRegionGeometry,
} from '../../utils/world-snapshot';

export type WorldGenerationDimensionsMeters = WorldSnapshotDimensionsMeters;
export type WorldGenerationRegionGeometry = WorldSnapshotRegionGeometry;
export type WorldGenerationRun = Omit<WorldSnapshotData, 'layers' | 'info'> & {
  readonly info: MapInfo;
};
export type WorldGenerationSnapshot = WorldSnapshotData & { readonly info: MapInfo };

export interface WorldGenerationCacheEntry {
  readonly layers: MapRasters;
  readonly info?: MapInfo;
}

export interface WorldGenerationCache {
  get(): WorldGenerationCacheEntry | undefined;
  save(snapshot: WorldGenerationSnapshot): void;
  clear(): void;
}

export interface WorldGenerationStageUpdate {
  readonly layers: MapRasters;
  readonly rasters: LayerDataRecord;
  readonly info?: MapInfo;
}

export interface WorldGenerationPorts {
  onPlannedStages?: (
    stages: readonly StageInfo[],
    skippedStageIds: readonly PipelineStageId[]
  ) => void;
  onStages?: (stages: readonly StageInfo[], skippedStageIds: readonly string[]) => void;
  onStart?: (run: WorldGenerationRun, layers: MapRasters) => void;
  onStage?: (update: WorldGenerationStageUpdate) => void;
  onEvent?: (event: GenerationEvent) => void;
}

import type {
  GenerationEvent,
  MacroRegionConfig,
  MacroRegionDeformation,
  MapConfig,
  PipelineStageId,
  StageInfo,
} from '@generator';
import type { LayerDataRecord, MapInfo, MapRasters } from '@layers';

export interface WorldGenerationDimensionsMeters {
  readonly widthMeters: number;
  readonly heightMeters: number;
}

export interface WorldGenerationRegionGeometry {
  readonly seed: number;
  readonly regions: readonly MacroRegionConfig[];
  readonly deformation: MacroRegionDeformation;
}

export interface WorldGenerationRun {
  readonly width: number;
  readonly height: number;
  readonly seed: string;
  readonly shape: MapConfig['world']['shape'];
  readonly regionGeometry: WorldGenerationRegionGeometry;
  readonly dimensionsMeters: WorldGenerationDimensionsMeters;
  readonly info: MapInfo;
}

export interface WorldGenerationSnapshot extends WorldGenerationRun {
  readonly layers: MapRasters;
}

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

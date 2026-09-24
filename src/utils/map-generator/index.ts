export { createMapGenerator } from './pipeline-factory';
export { createMacroRegionClassifier } from './macro-region-classifier';
export type { MacroRegionClassifierInput } from './macro-region-classifier';
export { selectMapInfo } from './info-definitions';
export { selectDomainOutputs } from './stage-outputs';
export { createWorldSpace, planarDistance, spaceOf } from './space';
export type { SampleGrid, WorldSpace } from './space';
export { DEFAULT_MACRO_DEFORMATION, DEFAULT_MACRO_REGIONS } from './stages/macro-region-defaults';
export { isLandmassLayout } from './stages/landmass-layout';
export { selectDirtyStageIds } from './selective-regeneration';
export { isPipelineStageId, MAP_CONFIG_KEYS, PIPELINE_STAGES } from './stage-definitions';
export type { MapConfigKey, PipelineStageId, StageInfo } from './stage-definitions';
import type { MapContext } from './context';
import type { PipelineStageId as PipelineId } from './stage-definitions';
import type {
  GenerationEvent as GenericEvent,
  GenerationResult as GenericResult,
  MapConfig,
  MapState,
  StageStatistics as GenericStatistics,
} from './types';
/** Canonical pipeline events, statistics and results narrowed to its stage ids. */
export type PipelineGenerationEvent = GenericEvent<PipelineId>;
export type PipelineStageStatistics = GenericStatistics<PipelineId>;
export type PipelineGenerationResult = GenericResult<
  MapContext<MapConfig, MapState, PipelineId>,
  PipelineId
>;
export { runGeneration } from './worker';
export type {
  GenerationWorkerOptions,
  PipelineWorkerGenerationResult,
  PipelineWorkerReuse,
  RunGeneration,
} from './worker';
export type {
  GenerationEvent,
  GenerationOptions,
  GenerationResult,
  GeologicalStructure,
  LandmassConfig,
  LandmassEdge,
  LandmassLayout,
  LandmassNode,
  MacroRegionConfig,
  MacroRegionDeformation,
  MacroRegionGeometry,
  MacroRegionNoiseSource,
  MacroRegionPoint,
  MapGeneratorOptions,
  MapConfig,
  MapState,
  NoiseConfig,
  StageMetric,
  StageMetrics,
  StageStatistics,
  WorldConfig,
} from './types';

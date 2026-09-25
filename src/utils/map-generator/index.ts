export { createMapGenerator } from './pipeline/pipeline-factory';
export { createMacroRegionClassifier } from './stages/macro-region';
export type { MacroRegionClassifierInput } from './stages/macro-region';
export { selectMapInfo } from './info-definitions';
export { selectDomainOutputs } from './pipeline/stage-outputs';
export { createWorldSpace, planarDistance, spaceOf } from './space';
export type { SampleGrid, WorldSpace } from './space';
export { DEFAULT_MACRO_DEFORMATION, DEFAULT_MACRO_REGIONS } from './stages/macro-region';
export { isLandmassLayout } from './stages/landmass';
export { DEFAULT_STRUCTURE_CHARACTER_CONFIG } from './stages/structure-character';
export { isStructureProfiles, isStructureRegions } from './stages/structure-character';
export { selectDirtyStageIds } from './pipeline/selective-regeneration';
export { isPipelineStageId, MAP_CONFIG_KEYS, PIPELINE_STAGES } from './pipeline/stage-definitions';
export type { MapConfigKey, PipelineStageId, StageInfo } from './pipeline/stage-definitions';
import type { MapContext } from './pipeline/context';
import type { PipelineStageId as PipelineId } from './pipeline/stage-definitions';
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
  StructureCharacterConfig,
  StructureRegionDefinition,
  StructureTerrainProfile,
  TerrainProfile,
  WorldConfig,
} from './types';

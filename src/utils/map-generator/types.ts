import type { WorldDimensions } from '../world-dimensions';
import type { WorldShape } from '../world-shape';

export interface WorldConfig {
  /** Physical world size together with the sample grid derived from it. */
  dimensions: WorldDimensions;
  seed: number;
  shape: WorldShape;
}

export interface SeededWorldConfig {
  world: {
    seed: number;
  };
}

export interface MacroRegionPoint {
  /** Normalized world coordinate in the 0..1 range. */
  readonly x: number;
  readonly y: number;
}

export type MacroRegionGeometry =
  | {
      readonly kind: 'ring';
      readonly center: MacroRegionPoint;
      readonly innerRadius: number;
      readonly outerRadius: number;
    }
  | {
      readonly kind: 'band';
      /** x creates a vertical band; y creates a horizontal band. */
      readonly axis: 'x' | 'y';
      /** Position on the selected axis, normalized to 0..1. */
      readonly center: number;
      /** Full band width in normalized world units. */
      readonly width: number;
    };

/** A categorical narrative zone; each generated cell belongs to exactly one region. */
export interface MacroRegionConfig {
  readonly id: string;
  readonly label: string;
  /** Base regions partition the world; overlays replace them inside their geometry. */
  readonly role: 'base' | 'overlay';
  readonly geometry: MacroRegionGeometry;
  /** Target gameplay danger of the region, from safe (0) to deadly (1). */
  readonly danger: number;
  /**
   * Border deformation override in normalized units for this region; when omitted,
   * the shared macro region deformation amplitude applies.
   */
  readonly irregularity?: number;
}

/** Border displacement; individual overlays may override the amplitude. */
export interface MacroRegionDeformation {
  /** How far the borders may shift in normalized units; 0 disables deformation. */
  readonly amplitude: number;
}

/** Normalized world coordinate in the 0..1 range. */
export interface WorldPoint {
  readonly x: number;
  readonly y: number;
}

/**
 * What kind of ground a region tends to express: ordinary ground, volcanic
 * relief or lagoons and reefs. The type is a label for the future heightmap;
 * the partition itself reads sizes and distances, never the name.
 */
export const GEOLOGICAL_REGION_TYPES = ['ordinary', 'volcanic', 'atoll'] as const;

export type GeologicalRegionType = (typeof GEOLOGICAL_REGION_TYPES)[number];

/** Editable settings of one region; the list position is its stable id. */
export interface GeologicalRegionConfig {
  readonly type: GeologicalRegionType;
  /** Relative area share: 1 is the even share of the world, higher grows it. */
  readonly size: number;
}

/** Whole-map arrangement of the regions: anchor spread and border noise. */
export interface GeologyLayoutConfig {
  /** How evenly the anchors spread over the world, 0..1. */
  readonly evenness: number;
  /** Border displacement, 0..1; 0 draws clean borders. */
  readonly irregularity: number;
}

/**
 * The geology intent: the count of full-world regions, the shared layout and
 * one entry per active region. It has no island geometry and no heights.
 */
export interface GeologyConfig {
  /** Number of regions covering the whole world, from 1 to 10. */
  readonly regionCount: number;
  readonly layout: GeologyLayoutConfig;
  /** Settings of the active regions in order; length equals `regionCount`. */
  readonly regions: readonly GeologicalRegionConfig[];
}

/** A seed-resolved region anchor with its geometry parameters. */
export interface GeologicalRegionPlan {
  readonly id: string;
  readonly type: GeologicalRegionType;
  readonly centre: WorldPoint;
  /** Relative size resolved from the configuration; drives the area share. */
  readonly weight: number;
  /** Rasterized area of the region, in square metres. */
  readonly areaSquareMeters: number;
}

/**
 * Resolved regions for one seed, indexed by `regionOwnerMap`. The regions own
 * the whole world; island shapes are never derived from this plan.
 */
export interface GeologyPlan {
  /** Region metadata indexed by `regionOwnerMap`; no region is an island shape. */
  readonly regions: readonly GeologicalRegionPlan[];
  /** Shape of the region rasters, allowing consumers to sample them safely. */
  readonly regionRasterSize: { readonly width: number; readonly height: number };
  /** Per-cell region ownership; -1 is outside the world mask. */
  readonly regionOwnerMap: Int16Array;
  /** Distance from the nearest region boundary, per cell, in metres. */
  readonly regionBorderDistanceMap: Float32Array;
  /** Area of every owned cell, the world inside the mask, in square metres. */
  readonly worldAreaSquareMeters: number;
}

export interface MapConfig extends SeededWorldConfig {
  world: WorldConfig;
  macroRegions?: readonly MacroRegionConfig[];
  macroRegionDeformation?: MacroRegionDeformation;
  /**
   * The geology intent from the Geology form; programmatic configs may omit it
   * and the stage falls back to `DEFAULT_GEOLOGY_CONFIG`.
   */
  geology?: GeologyConfig;
}

/**
 * Generator state. Each field is an output of one stage. The layer catalog
 * displays a subset of these keys; it does not define them.
 */
export interface MapState {
  /** Produced by the world-shape stage. */
  worldMask?: Uint8Array;
  /** Produced by the macro-region stage. */
  macroRegionIdMap?: Uint8Array;
  /** Produced by the macro-region stage: ground area per region, in square metres. */
  macroRegionAreas?: readonly number[];
  /**
   * Produced by the geology stage. Resolved regions with their owner and border
   * rasters; island shapes are not derived from this plan.
   */
  geologyPlan?: GeologyPlan;
}

export type StageMetric = number | string;
export type StageMetrics = Record<string, StageMetric> & {
  /** Size of the data produced by this stage, in bytes. */
  bytes?: number;
};

export interface StageStatistics<TId extends string = string> {
  stageId: TId;
  stageName: string;
  status: 'completed' | 'failed' | 'skipped';
  startedAt: number;
  finishedAt: number;
  durationMs: number;
  details?: StageMetrics;
}

export type StageData = Record<string, unknown>;

interface StageEventBase<TId extends string = string> {
  stageId: TId;
  stageName: string;
  stageIndex: number;
  stageCount: number;
}

type StageStartedEvent<TId extends string = string> = StageEventBase<TId> & {
  type: 'stage-started';
};

type StageProgressEvent<TId extends string = string> = StageEventBase<TId> & {
  type: 'stage-progress';
  /** Completion of the stage in the 0..1 range. */
  progress: number;
};

type StageCompletedEvent<TId extends string = string> = StageEventBase<TId> & {
  type: 'stage-completed';
  statistics: StageStatistics<TId>;
  /** Read-only snapshot; typed arrays are shared with the generator state. */
  data: Readonly<StageData>;
};

type StageFailedEvent<TId extends string = string> = StageEventBase<TId> & {
  type: 'stage-failed';
  statistics: StageStatistics<TId>;
};

type StageSkippedEvent<TId extends string = string> = StageEventBase<TId> & {
  type: 'stage-skipped';
  statistics: StageStatistics<TId>;
};

export type GenerationEvent<TId extends string = string> =
  | StageStartedEvent<TId>
  | StageProgressEvent<TId>
  | StageCompletedEvent<TId>
  | StageFailedEvent<TId>
  | StageSkippedEvent<TId>;

export type StageProgressReporter = (progress: number) => void;

export interface GenerationOptions<TId extends string = string> {
  signal?: AbortSignal;
  onEvent?: (event: GenerationEvent<TId>) => void;
  /** Stages reused from cached outputs; their data must already be in the state. */
  skipStageIds?: readonly TId[];
}

export interface MapGeneratorOptions<TConfig = unknown> {
  stageDelayMs?: number;
  /** Runs before the first stage so an invalid config never allocates data. */
  validateConfig?: (config: Readonly<TConfig>) => void;
  /** Configuration paths the stages may declare; unknown ones fail construction. */
  knownConfigKeys?: readonly string[];
}

export interface GenerationResult<TContext, TId extends string = string> {
  context: TContext;
  statistics: readonly StageStatistics<TId>[];
  totalDurationMs: number;
}

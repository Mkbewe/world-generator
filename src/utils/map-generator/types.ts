import type { MapRasters } from '../map-layers';
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

export interface NoiseConfig {
  /** Number of base noise cycles across the normalized world space. */
  frequency: number;
  octaves: number;
  persistence: number;
  lacunarity: number;
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

export type MacroRegionNoiseSource = 'dedicated' | 'noise-map';

/** Border displacement; individual overlays may override the amplitude. */
export interface MacroRegionDeformation {
  /** How far the borders may shift in normalized units; 0 disables deformation. */
  readonly amplitude: number;
  /** Defaults to the dedicated region noise when omitted. */
  readonly source?: MacroRegionNoiseSource;
}

/** Normalized world coordinate in the 0..1 range. */
export interface WorldPoint {
  readonly x: number;
  readonly y: number;
}

/**
 * Elongated blob that adds or cuts land around a structure's spine; all values
 * are in normalized world units.
 */
export interface LandShape {
  readonly id: string;
  readonly center: WorldPoint;
  /** Half of the shape's length along its axis. */
  readonly halfLength: number;
  /** Half of the shape's width across its axis. */
  readonly halfWidth: number;
  /** Rotation of the shape's axis in radians. */
  readonly orientation: number;
  /** How far the outline may bend away from the ellipse; applied by later stages. */
  readonly irregularity: number;
}

/** Shallow water apron around one or more structures; shared by archipelagos. */
export interface ShelfDefinition {
  readonly id: string;
  /** Width of the shelf band in normalized units. */
  readonly width: number;
  /** Height of the shelf's outer edge; the deep ocean floor lies below it. */
  readonly targetDepth: number;
  /** How quickly the shelf falls towards the deep ocean; 0..1. */
  readonly falloff: number;
  readonly irregularity: number;
}

/** One geological structure: the spine, its width profile, shapes and shelf. */
export interface LandmassDefinition {
  readonly id: string;
  /** Spine polyline in normalized coordinates; at least two points. */
  readonly spine: readonly WorldPoint[];
  /** Half-width at every spine point, in normalized units. */
  readonly widthProfile: readonly number[];
  /** Direction of the structure in radians; kept for later stages and debugging. */
  readonly orientation: number;
  /** Coastline roughness reserved for later stages. */
  readonly irregularity: number;
  readonly positiveShapes: readonly LandShape[];
  readonly negativeShapes: readonly LandShape[];
  readonly shelfId: string;
}

/** Every landmass definition plus the shared shelves they reference. */
export interface LandmassLayout {
  readonly landmasses: readonly LandmassDefinition[];
  readonly shelves: readonly ShelfDefinition[];
}

/** Shelf template applied to every shelf group. */
export type ShelfConfig = Omit<ShelfDefinition, 'id'>;

/** Recognizable outlines the layout can give a structure. */
export type LandmassArchetype =
  | 'round'
  | 'oval'
  | 'elongated'
  | 'irregular'
  | 'o'
  | 'c'
  | 'l'
  | 'u'
  | 's'
  | 'z'
  | 'v'
  | 'y'
  | 'x'
  | 't';

/** Controls the landmass layout stage. */
export interface LandmassConfig {
  /** Number of independently generated structures. */
  readonly count: number;
  /** Relative size of a structure; 1 is the largest. */
  readonly size: number;
  /** Archetypes drawn for the structures; undefined keeps the whole pool. */
  readonly archetypes?: readonly LandmassArchetype[];
  /** Coastline roughness reserved for later stages; 0..1. */
  readonly irregularity: number;
  readonly shelf: ShelfConfig;
}

export interface MapConfig extends SeededWorldConfig {
  world: WorldConfig;
  noise: NoiseConfig;
  macroRegions?: readonly MacroRegionConfig[];
  macroRegionDeformation?: MacroRegionDeformation;
  landmasses?: LandmassConfig;
}

/** Stage-only domain data kept next to the shared rasters. */
export interface MapDomainData {
  /** Landmass definitions produced by the landmass layout stage. */
  landmassLayout?: LandmassLayout;
}

/** Generator state: the shared rasters plus the stage-only domain data. */
export type MapState<TDomainData extends object = MapDomainData> = MapRasters & TDomainData;

export type StageMetric = number | string;
export type StageMetrics = Record<string, StageMetric> & {
  /** Size of the data produced by this stage, in bytes. */
  bytes?: number;
};

export interface StageStatistics {
  stageId: string;
  stageName: string;
  status: 'completed' | 'failed' | 'skipped';
  startedAt: number;
  finishedAt: number;
  durationMs: number;
  details?: StageMetrics;
}

export type StageData = Record<string, unknown>;

interface StageEventBase {
  stageId: string;
  stageName: string;
  stageIndex: number;
  stageCount: number;
}

type StageStartedEvent = StageEventBase & {
  type: 'stage-started';
};

type StageProgressEvent = StageEventBase & {
  type: 'stage-progress';
  /** Completion of the stage in the 0..1 range. */
  progress: number;
};

type StageCompletedEvent = StageEventBase & {
  type: 'stage-completed';
  statistics: StageStatistics;
  /** Read-only snapshot; typed arrays are shared with the generator state. */
  data: Readonly<StageData>;
};

type StageFailedEvent = StageEventBase & {
  type: 'stage-failed';
  statistics: StageStatistics;
};

type StageSkippedEvent = StageEventBase & {
  type: 'stage-skipped';
  statistics: StageStatistics;
};

export type GenerationEvent =
  | StageStartedEvent
  | StageProgressEvent
  | StageCompletedEvent
  | StageFailedEvent
  | StageSkippedEvent;

export type StageProgressReporter = (progress: number) => void;

export interface GenerationOptions {
  signal?: AbortSignal;
  onEvent?: (event: GenerationEvent) => void;
  /** Stages reused from cached outputs; their data must already be in the state. */
  skipStageIds?: readonly string[];
}

export interface MapGeneratorOptions<TConfig = unknown> {
  stageDelayMs?: number;
  /** Runs before the first stage so an invalid config never allocates data. */
  validateConfig?: (config: Readonly<TConfig>) => void;
  /** Configuration paths the stages may declare; unknown ones fail construction. */
  knownConfigKeys?: readonly string[];
}

export interface GenerationResult<TContext> {
  context: TContext;
  statistics: readonly StageStatistics[];
  totalDurationMs: number;
}

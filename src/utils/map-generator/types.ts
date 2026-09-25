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
 * A control point of a geological structure: its influence reaches `radius`
 * around `position`, and the influence interpolates smoothly along the edges.
 */
export interface LandmassNode {
  readonly id: string;
  readonly position: WorldPoint;
  /** Influence radius at this node, in normalized world units. */
  readonly radius: number;
}

/** A connection between two nodes; control points bend it into a smooth curve. */
export interface LandmassEdge {
  readonly id: string;
  readonly from: string;
  readonly to: string;
  /** Points between the ends, in travel order; absent for a straight edge. */
  readonly controlPoints?: readonly WorldPoint[];
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

/** One geological structure: its intent, ridge graph and shelf. */
export interface GeologicalStructure {
  readonly id: string;
  readonly archetype: LandmassArchetype;
  readonly nodes: readonly LandmassNode[];
  readonly edges: readonly LandmassEdge[];
  readonly shelfId: string;
  /** Number of nodes belonging to the main corridor (they always come first). */
  readonly mainNodeCount?: number;
}

/** Every geological structure plus the shared shelves they reference. */
export interface LandmassLayout {
  readonly structures: readonly GeologicalStructure[];
  readonly shelves: readonly ShelfDefinition[];
}

/** Shelf template applied to every shelf group. */
export type ShelfConfig = Omit<ShelfDefinition, 'id'>;

/** Shape intents the layout can give a structure. */
export type LandmassArchetype = 'round' | 'irregular' | 'elongated' | 'branched' | 'lagoon';

/** Controls the landmass layout stage. */
export interface LandmassConfig {
  /** Number of independently generated structures. */
  readonly count: number;
  /**
   * Typical island size on a small-to-large scale from 0 to 1. The stage
   * converts it against the world dimensions, so islands grow with the world
   * — but only weakly, never proportionally.
   */
  readonly size: number;
  /** How strongly the structure sizes differ; 0 keeps them nearly equal. */
  readonly diversity: number;
  /** Archetypes drawn for the structures; undefined keeps the whole pool. */
  readonly archetypes?: readonly LandmassArchetype[];
  readonly shelf: ShelfConfig;
}

/**
 * Eight terrain intent values, each 0..1, without identity. The heightmap
 * reads them as follows: `elevation` from deep ocean floor to peak,
 * `roughness` as micro-relief amplitude, `mountainStrength`, `hillStrength`
 * and `plateauStrength` as competing landform tendencies, `lakePotential`
 * as lake propensity where the terrain allows, `erosionStrength` as
 * smoothing and carving, `coastalCliffStrength` as steep coasts.
 */
export interface TerrainProfile {
  readonly elevation: number;
  readonly roughness: number;
  readonly mountainStrength: number;
  readonly hillStrength: number;
  readonly plateauStrength: number;
  readonly lakePotential: number;
  readonly erosionStrength: number;
  readonly coastalCliffStrength: number;
}

/** Terrain intent of one geological structure; the input for the heightmap. */
export interface StructureTerrainProfile extends TerrainProfile {
  readonly structureId: string;
}

/**
 * A regional override of a structure profile. The profile is a full value
 * set, not a delta: the heightmap blends overlapping regions by influence
 * weight, and the base structure profile applies outside every influence.
 */
export interface StructureRegionDefinition {
  readonly id: string;
  readonly structureId: string;
  readonly center: WorldPoint;
  readonly influenceRadius: number;
  readonly profile: TerrainProfile;
}

/** Controls the structure character stage. */
export interface StructureCharacterConfig {
  /** Spread of the per-structure profile around its archetype tendency; 0..1. */
  readonly profileVariation: number;
  /** Density of regional overrides on large structures; 0 grows none; 0..1. */
  readonly regionDensity: number;
}

export interface MapConfig extends SeededWorldConfig {
  world: WorldConfig;
  noise: NoiseConfig;
  macroRegions?: readonly MacroRegionConfig[];
  macroRegionDeformation?: MacroRegionDeformation;
  landmasses?: LandmassConfig;
  structureCharacter?: StructureCharacterConfig;
}

/**
 * Generator state. Each field is an output of one stage. The layer catalog
 * displays a subset of these keys; it does not define them.
 */
export interface MapState {
  /** Produced by the world-shape stage. */
  worldMask?: Uint8Array;
  /** Produced by the noise stage. */
  noiseMap?: Float32Array;
  /** Produced by the macro-region stage. */
  macroRegionIdMap?: Uint8Array;
  /** Produced by the landmass-layout stage. */
  landmassLayout?: LandmassLayout;
  /** Produced by the structure-character stage. */
  structureProfiles?: readonly StructureTerrainProfile[];
  structureRegions?: readonly StructureRegionDefinition[];
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

/**
 * A state input a stage reads only while the config selects it — the data
 * twin of `ConditionalConfigKey`. The pipeline asserts the resolved set at
 * runtime; the factory orders by the union, so presentation order never
 * breaks the data flow.
 */
export interface ConditionalRead<TConfig extends SeededWorldConfig, TState extends object> {
  readonly key: keyof TState;
  readonly when: (config: Readonly<TConfig>) => boolean;
}

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

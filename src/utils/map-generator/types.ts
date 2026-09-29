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

/**
 * Controls the heightmap stage. The stage stores land positive and sea floor
 * negative, with `0` as the sea datum; the open ocean floor is the constant
 * `OCEAN_DEPTH_METERS` and is not configurable. The noise bands are constants
 * of the stage. Local seabed, shelf and form sizes live per geological area:
 * `seabedOffsetMeters` is an offset from the global ocean floor and `relief`
 * stays the global amplitude lean over every area.
 */
export interface HeightmapConfig {
  /** Terrain relief: 0 is flat, 1 is very mountainous; scales land amplitude. */
  readonly relief: number;
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
  /** Depth of the shelf's inner edge, in metres below the sea datum. */
  readonly targetDepth: number;
  /** How quickly the shelf falls towards the deep ocean; 0..1. */
  readonly falloff: number;
  /**
   * @deprecated Dead parameter; the shelf shape is replaced by the geology
   * area seabed fields and the field noise (GEO-03/GEO-05B).
   */
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
/**
 * @deprecated Replaced by {@link GeologyPlan}; kept until the corridor
 * implementation is removed (GEO-06).
 */
export interface LandmassLayout {
  readonly structures: readonly GeologicalStructure[];
  readonly shelves: readonly ShelfDefinition[];
}

/** Shelf template applied to every shelf group. */
export type ShelfConfig = Omit<ShelfDefinition, 'id'>;

/** Shape intents the layout can give a structure. */
export type LandmassArchetype = 'round' | 'irregular' | 'elongated' | 'branched' | 'lagoon';

/**
 * @deprecated Replaced by {@link GeologyConfig}; kept until the corridor
 * implementation is removed (GEO-06).
 */
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
 * The primary terrain intent of a character zone. Determines what kind of
 * landform a zone represents; features (plateau, lakes, cliffs, erosion) are
 * derived from this value, so incompatible combinations cannot occur.
 */
export const TERRAIN_CHARACTERS = ['plains', 'hills', 'mountains'] as const;

export type TerrainCharacter = (typeof TERRAIN_CHARACTERS)[number];

/**
 * Spatial extent of a character zone within its geological structure. Geometry
 * follows the structure skeleton, never a flat shape in world space.
 *
 * - `whole`  — covers the entire structure; every structure has at least one.
 * - `chain`  — a stretch of one continuous path, as fractions of its length.
 * - `spine`  — its core band, `share` of the local corridor radius.
 * - `rim`    — its outer band, the outer `share` of the local corridor radius.
 * - `point`  — a circular area anchored at `center` with `influenceRadius`.
 */
export type ZoneGeometry =
  | { readonly kind: 'whole' }
  | { readonly kind: 'chain'; readonly pathId: string; readonly from: number; readonly to: number }
  | {
      readonly kind: 'spine';
      readonly pathId: string;
      readonly from: number;
      readonly to: number;
      readonly share: number;
    }
  | {
      readonly kind: 'rim';
      readonly pathId: string;
      readonly from: number;
      readonly to: number;
      readonly share: number;
    }
  | { readonly kind: 'point'; readonly center: WorldPoint; readonly influenceRadius: number };

/**
 * One terrain character zone belonging to a geological structure. Later zones
 * dominate where their footprints overlap. The domain zone sampler blends
 * their field values across boundaries; `whole` supplies the base profile.
 */
export interface CharacterZone {
  readonly id: string;
  readonly structureId: string;
  readonly character: TerrainCharacter;
  readonly geometry: ZoneGeometry;
  /** Concrete field values sampled within the character's ranges. */
  readonly values: TerrainProfile;
}

/**
 * @deprecated The relief lives in the geology area profiles; kept until the
 * corridor implementation is removed (GEO-06).
 */
export interface StructureCharacterConfig {
  /**
   * Controls character variation; 0 keeps every structure single-character.
   * The number of zones also responds to extent, usable skeleton length,
   * corridor width and branch count. A layout is selected before characters.
   */
  readonly characterVariation: number;
  /**
   * Leans character draws across the whole world: 0 favours flat `plains`,
   * 1 favours `mountains`, 0.5 keeps every allowed character equally likely.
   * It only reweights the characters an archetype allows, so `lagoon` (plains
   * only) and `elongated` (no mountains) stay within their own rules.
   */
  readonly terrainBias: number;
}

/**
 * Eight terrain values, each 0..1, sampled for one zone. The heightfield reads
 * elevation, roughness, mountainStrength and hillStrength; plateau, lake,
 * erosion and cliff strengths stay for the later hydrology and erosion stages.
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

/**
 * @deprecated Replaced by {@link CharacterZone}. Will be removed when
 * HeightmapStage is implemented.
 */
export interface StructureTerrainProfile extends TerrainProfile {
  readonly structureId: string;
}

/**
 * @deprecated Replaced by {@link CharacterZone}. Will be removed when
 * HeightmapStage is implemented.
 */
export interface StructureRegionDefinition {
  readonly id: string;
  readonly structureId: string;
  readonly center: WorldPoint;
  readonly influenceRadius: number;
  readonly profile: TerrainProfile;
}

/**
 * How an area gets its place in the world: `automatic` draws a spot from the
 * seed, `fixed` pins the centre the user picked (in normalized 0..1 units).
 * An impossible automatic placement is reported per entry and blocks
 * generation; entries are never shrunk or dropped silently.
 */
export type GeologicalAreaPlacement =
  { readonly kind: 'automatic' } | { readonly kind: 'fixed'; readonly position: WorldPoint };

/**
 * Why one automatic area could not be placed. Reported instead of shrinking or
 * dropping the entry; generation stops and the form shows the reason at the
 * offending id.
 */
export interface GeologyPlacementProblem {
  readonly areaId: string;
  readonly reason: string;
}

/**
 * What kind of ground the area tends to build: ordinary islands, volcanic
 * relief or lagoons and reefs. The character picks starter values and the
 * form's controls; the field still reads values, never the name.
 */
export const GEOLOGICAL_CHARACTERS = ['ordinary', 'volcanic', 'atoll'] as const;

export type GeologicalCharacter = (typeof GEOLOGICAL_CHARACTERS)[number];

/**
 * One geological area: a plan of possibilities, never an island outline. The
 * fields carry behaviour as profile data, so consumers never branch on a
 * variant name. Lengths are either a normalized world share or explicit metres.
 *
 * Placement and profile draw from named streams derived from the area id, so
 * this entry keeps its own candidate draws however other entries are added or
 * reordered, and changing relief never moves it. Automatic placement still
 * spreads against neighbours in id order, so an entry added before this one
 * may shift its pick among its own candidates. Noise is sampled
 * at world points: moving an area keeps its id and parameters but changes the
 * local detail it lands on.
 */
export interface GeologicalAreaConfig {
  /** Stable id; per-area seed streams and provenance derive from it. */
  readonly id: string;
  /** What the area tends to build; picks the starter values and the card. */
  readonly character: GeologicalCharacter;
  readonly placement: GeologicalAreaPlacement;
  /** Influence radius in normalized world units; the area fades out before it. */
  readonly extent: number;
  /** 0 is a round influence, 1 a long thin band; the shape of the area, not of a land. */
  readonly elongation: number;
  /** Heading of the long axis in radians, normalized to [0, 2π). */
  readonly direction: number;
  /** Expected share of the extent that carries uplifts, 0..1. */
  readonly upliftDensity: number;
  /**
   * Approximate size of the uplifts in metres; larger values lean the broad
   * noise mix towards the large band, smaller ones towards the medium band.
   * It shifts the mix, it is not a literal wavelength of the field.
   */
  readonly upliftScaleMeters: number;
  /**
   * Linear contrast gain of the broad forms, 0..1: higher values lift the
   * highs and deepen the lows, so one area breaks into more separate uplifts.
   */
  readonly fragmentation: number;
  /** Local seabed offset from the global ocean base, in metres; negative deepens. */
  readonly seabedOffsetMeters: number;
  /**
   * Stretches the influence fade past the area edge, in metres (a share of the
   * world side); the apron is shallower than the open ocean. 0 keeps the edge
   * exactly at the area extent.
   */
  readonly shelfWidthMeters: number;
  /** Strength of local reef rims and lower lagoons, 0..1. */
  readonly rimStrength: number;
  /** Dominant relief of the area; the profile sampler derives concrete values from it. */
  readonly relief: TerrainCharacter;
}

/**
 * The geology intent: the user's area list. The global ocean base and the
 * heightmap bands live in `HeightmapConfig`, so area seabed fields are offsets
 * from it. The list order carries no priority: neither height nor provenance
 * may resolve by index.
 */
export interface GeologyConfig {
  readonly areas: readonly GeologicalAreaConfig[];
}

/** One area resolved by the geology stage for a seed. */
export interface GeologicalAreaPlan {
  readonly id: string;
  /** See `GeologicalAreaConfig.character`; the field ignores it. */
  readonly character: GeologicalCharacter;
  readonly centre: WorldPoint;
  readonly extent: number;
  readonly elongation: number;
  readonly direction: number;
  readonly upliftDensity: number;
  /** See `GeologicalAreaConfig.upliftScaleMeters`; the field reads the mix lean. */
  readonly upliftScaleMeters: number;
  /** See `GeologicalAreaConfig.fragmentation`; the field reads the contrast gain. */
  readonly fragmentation: number;
  readonly seabedOffsetMeters: number;
  /** See `GeologicalAreaConfig.shelfWidthMeters`; the field reads the fade stretch. */
  readonly shelfWidthMeters: number;
  readonly rimStrength: number;
  /** Local reef and lagoon tendencies; these are not island outlines. */
  readonly reefSites: readonly ReefSite[];
  readonly relief: TerrainCharacter;
  /** Concrete profile values sampled for this area. */
  readonly profile: TerrainProfile;
}

/** One local tendency within an atoll-capable area, in the shared world frame. */
export interface ReefSite {
  readonly centre: WorldPoint;
  readonly radius: number;
}

/**
 * Resolved areas for one seed, ordered by id. The diagnostic provenance index
 * is the position in `areas`, mapped by `createProvenanceIndex`; a cell outside
 * every area keeps `PROVENANCE_OUTSIDE`, so the label stays stable when the
 * config list order changes. Island ids are a separate result of
 * `LandOceanStage`, never derived from this plan.
 */
export interface GeologyPlan {
  readonly areas: readonly GeologicalAreaPlan[];
}

export interface MapConfig extends SeededWorldConfig {
  world: WorldConfig;
  noise: NoiseConfig;
  macroRegions?: readonly MacroRegionConfig[];
  macroRegionDeformation?: MacroRegionDeformation;
  landmasses?: LandmassConfig;
  structureCharacter?: StructureCharacterConfig;
  /**
   * The geology area list from the Geology form; programmatic configs may omit
   * it and the stage falls back to `DEFAULT_GEOLOGY_CONFIG`.
   */
  geology?: GeologyConfig;
  heightmap?: HeightmapConfig;
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
  /** @deprecated Produced by the landmass-layout stage; replaced by `geologyPlan`. */
  landmassLayout?: LandmassLayout;
  /** @deprecated Produced by the structure-character stage; replaced by `geologyPlan`. */
  structureZones?: readonly CharacterZone[];
  /**
   * Produced by the geology stage. Resolved areas with their profiles; the
   * actual heights and islands belong to `HeightmapStage` and `LandOceanStage`.
   */
  geologyPlan?: GeologyPlan;
  /**
   * Produced by the heightmap stage. Land height and sea-floor depth in metres
   * relative to the sea datum (`0`); cells outside the world mask are `0`.
   */
  heightmap?: Float32Array;
  /**
   * Produced by the heightmap stage. Diagnostic provenance index per cell, the
   * position in `GeologyPlan.areas`; `PROVENANCE_OUTSIDE` outside every area.
   */
  provenanceMap?: Int16Array;
  /** @deprecated Shelf index from the corridor model; replaced by `provenanceMap`. */
  shelfIndexMap?: Int16Array;
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

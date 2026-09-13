export interface WorldConfig {
  width: number;
  height: number;
  seed: number;
  shape?: 'disc' | 'rectangle';
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
}

/** Domain warping applied to macro region borders; shared by every region. */
export interface MacroRegionDeformation {
  /** How far the borders may shift in normalized units; 0 disables deformation. */
  readonly amplitude: number;
  /** Noise scale: smaller makes large lobes, larger makes fine wobble. Defaults to 3. */
  readonly frequency?: number;
  /** Number of fBm octaves; defaults to 2. */
  readonly octaves?: number;
  /** Random stream namespace; defaults to "macro-region". */
  readonly seed?: string;
}

export interface MapConfig extends SeededWorldConfig {
  world: WorldConfig;
  noise: NoiseConfig;
  macroRegions?: readonly MacroRegionConfig[];
  macroRegionDeformation?: MacroRegionDeformation;
}

export interface MapState {
  worldMask?: Uint8Array;
  noiseMap?: Float32Array;
  macroRegionIdMap?: Uint8Array;
}

export type StageMetric = number | string;
export type StageMetrics = Record<string, StageMetric> & {
  /** Size of the data produced by this stage, in bytes. */
  bytes?: number;
};

export interface StageStatistics {
  stageId: string;
  stageName: string;
  status: 'completed' | 'failed';
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

export type GenerationEvent =
  StageStartedEvent | StageProgressEvent | StageCompletedEvent | StageFailedEvent;

export type StageProgressReporter = (progress: number) => void;

export interface GenerationOptions {
  signal?: AbortSignal;
  onEvent?: (event: GenerationEvent) => void;
}

export interface MapGeneratorOptions {
  stageDelayMs?: number;
}

export interface GenerationResult<TContext> {
  context: TContext;
  statistics: readonly StageStatistics[];
  totalDurationMs: number;
}

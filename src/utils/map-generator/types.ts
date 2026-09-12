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

/** Narrative zone with a smooth field of influence; independent of the world shape. */
export interface MacroRegionConfig {
  readonly id: string;
  readonly label: string;
  readonly center: MacroRegionPoint;
  /** Distance from the center where the region has full influence. */
  readonly radius: number;
  /** Width of the falloff band on both sides of the ring. */
  readonly falloff: number;
  /** Inner edge of the ring; 0 makes it a full disc. Defaults to 0. */
  readonly innerRadius?: number;
  /** Narrative progression/danger level of the region, 0..1. */
  readonly progression: number;
  /** Relative influence strength; defaults to 1. */
  readonly weight?: number;
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
  progressionMap?: Float32Array;
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

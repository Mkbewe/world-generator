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

export interface MapConfig extends SeededWorldConfig {
  world: WorldConfig;
  noise: NoiseConfig;
}

export interface MapState {
  worldMask?: Uint8Array;
  noiseMap?: Float32Array;
}

export interface StageStatistics {
  stageId: string;
  stageName: string;
  status: 'completed' | 'failed';
  startedAt: number;
  finishedAt: number;
  durationMs: number;
  details?: Record<string, string | number>;
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
  data: StageData;
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

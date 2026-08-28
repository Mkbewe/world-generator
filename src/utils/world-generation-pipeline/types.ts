export interface WorldConfig {
  width: number;
  height: number;
  seed: number;
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

export interface WorldGeneratorConfig extends SeededWorldConfig {
  world: WorldConfig;
  noise: NoiseConfig;
}

export interface WorldGenerationState {
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
}

interface StageEventBase {
  stageId: string;
  stageName: string;
  stageIndex: number;
  stageCount: number;
}

type StageStartedEvent = StageEventBase & {
  type: 'stage-started';
};

type StageFinishedEvent = StageEventBase & {
  type: 'stage-completed' | 'stage-failed';
  statistics: StageStatistics;
};

export type GenerationEvent = StageStartedEvent | StageFinishedEvent;

export interface GenerationOptions {
  signal?: AbortSignal;
  onEvent?: (event: GenerationEvent) => void;
}

export interface GenerationResult<TContext> {
  context: TContext;
  statistics: readonly StageStatistics[];
  totalDurationMs: number;
}

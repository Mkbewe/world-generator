import {
  type GenerationEvent,
  type MapConfig,
  PipelineWorkerClient,
  type StageStatistics,
} from '../../utils/map-generator';
import {
  cacheGeneratedMap,
  hasAllBaseLayers,
  isBaseLayerId,
  type MapRenderer,
  sourceOf,
} from '../../utils/map-renderer';
import type { GenerationProgressState } from '../generation-progress';

export interface GenerationResult {
  statistics: readonly StageStatistics[];
  totalDurationMs: number;
}

export async function generateMap(
  config: MapConfig,
  preview: MapRenderer,
  onProgress: (progress: GenerationProgressState) => void
): Promise<GenerationResult> {
  const worker = new PipelineWorkerClient();
  const signal = preview.signal;
  const abort = (): void => worker.dispose();
  signal.addEventListener('abort', abort, { once: true });

  try {
    const result = await worker.generate(config, {
      onEvent(event) {
        signal.throwIfAborted();
        applyStage(event, preview);
        onProgress(toProgress(event));
      },
    });

    signal.throwIfAborted();
    const layers = preview.getLayers();
    if (!hasAllBaseLayers(layers)) {
      throw new Error('Pipeline completed without all required map layers.');
    }

    cacheGeneratedMap({
      width: config.world.width,
      height: config.world.height,
      seed: String(config.world.seed),
      shape: config.world.shape ?? 'disc',
      size: config.world.width,
      layers,
    });

    return {
      statistics: result.statistics.map(stage =>
        isBaseLayerId(stage.stageId) ? withRange(stage, preview.range(stage.stageId)) : stage
      ),
      totalDurationMs: result.totalDurationMs,
    };
  } finally {
    signal.removeEventListener('abort', abort);
    worker.dispose();
  }
}

function applyStage(event: GenerationEvent, preview: MapRenderer): void {
  if (event.type === 'stage-completed' && isBaseLayerId(event.stageId)) {
    preview.add(event.stageId, event.data[sourceOf(event.stageId)]);
  }
}

function withRange(
  stage: StageStatistics,
  range: { min: number; max: number } | undefined
): StageStatistics {
  return range ? { ...stage, details: { min: range.min, max: range.max } } : stage;
}

function toProgress(event: GenerationEvent): GenerationProgressState {
  return {
    stageName: event.stageName,
    stageIndex: event.stageIndex,
    stageCount: event.stageCount,
    percentage: event.type === 'stage-completed' ? 100 : 0,
    status: event.type === 'stage-failed' ? 'failed' : 'running',
  };
}

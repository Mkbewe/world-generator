import type { GenerationStatistics } from '../../stores';
import {
  type GenerationEvent,
  MAP_STAGES,
  type MapConfig,
  PipelineWorkerClient,
} from '../../utils/map-generator';
import type { MapRenderer } from '../../utils/map-renderer';
import { type GenerationProgressState, ProgressTracker } from '../generation-progress';

export async function generateMap(
  config: MapConfig,
  renderer: MapRenderer,
  onProgress: (progress: GenerationProgressState) => void
): Promise<GenerationStatistics> {
  const worker = new PipelineWorkerClient();
  const signal = renderer.signal;
  const abort = (): void => worker.dispose();
  signal.addEventListener('abort', abort, { once: true });

  const progress = new ProgressTracker(MAP_STAGES, onProgress);
  progress.start();

  try {
    const result = await worker.generate(config, {
      onEvent(event) {
        signal.throwIfAborted();
        applyStage(event, renderer);
        progress.handle(event);
      },
    });

    signal.throwIfAborted();
    if (!renderer.isComplete()) {
      throw new Error('Pipeline completed without all required map layers.');
    }
    renderer.save();

    progress.complete(result.totalDurationMs);

    return {
      statistics: result.statistics,
      totalDurationMs: result.totalDurationMs,
    };
  } finally {
    signal.removeEventListener('abort', abort);
    worker.dispose();
  }
}

function applyStage(event: GenerationEvent, renderer: MapRenderer): void {
  if (event.type === 'stage-completed') {
    renderer.addStageData(event.stageId, event.data);
  }
}

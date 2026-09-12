import {
  type GenerationStatistics,
  useGenerationStatisticsStore,
} from './generation-statistics-store';
import type { StageStatistics } from '../utils/map-generator';

function createStage(overrides: Partial<StageStatistics> = {}): StageStatistics {
  return {
    stageId: 'noise',
    stageName: 'Noise generation',
    status: 'completed',
    startedAt: 0,
    finishedAt: 20.4,
    durationMs: 20.4,
    ...overrides,
  };
}

function createResult(overrides: Partial<GenerationStatistics> = {}): GenerationStatistics {
  return {
    statistics: [createStage()],
    totalDurationMs: 20.4,
    ...overrides,
  };
}

describe('useGenerationStatisticsStore', () => {
  beforeEach(() => {
    useGenerationStatisticsStore.setState({ result: undefined });
  });

  it('starts without a result', () => {
    expect(useGenerationStatisticsStore.getState().result).toBeUndefined();
  });

  it('stores the result through setResult', () => {
    const result = createResult();

    useGenerationStatisticsStore.getState().setResult(result);

    expect(useGenerationStatisticsStore.getState().result).toBe(result);
  });

  it('notifies subscribers when the result is updated', () => {
    const listener = vi.fn();
    const unsubscribe = useGenerationStatisticsStore.subscribe(listener);

    useGenerationStatisticsStore.getState().setResult(createResult());

    unsubscribe();

    expect(listener).toHaveBeenCalledTimes(1);
  });
});

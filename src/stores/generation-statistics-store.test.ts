import { useGenerationStatisticsStore } from './generation-statistics-store';
import type { StageStatistics } from '../utils/map-generator';

function createStatistics(overrides: Partial<StageStatistics> = {}): StageStatistics {
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

describe('useGenerationStatisticsStore', () => {
  beforeEach(() => {
    useGenerationStatisticsStore.setState({ statistics: [], totalDurationMs: undefined });
  });

  it('starts with an empty statistics list', () => {
    const state = useGenerationStatisticsStore.getState();

    expect(state.statistics).toEqual([]);
    expect(state.totalDurationMs).toBeUndefined();
  });

  it('stores the statistics and total duration through setResult', () => {
    const statistics = [createStatistics()];

    useGenerationStatisticsStore.getState().setResult({ statistics, totalDurationMs: 20.4 });

    const state = useGenerationStatisticsStore.getState();
    expect(state.statistics).toBe(statistics);
    expect(state.totalDurationMs).toBe(20.4);
  });

  it('notifies subscribers when the result is updated', () => {
    const listener = vi.fn();
    const unsubscribe = useGenerationStatisticsStore.subscribe(listener);

    useGenerationStatisticsStore.getState().setResult({
      statistics: [createStatistics()],
      totalDurationMs: 20.4,
    });

    unsubscribe();

    expect(listener).toHaveBeenCalledTimes(1);
  });
});

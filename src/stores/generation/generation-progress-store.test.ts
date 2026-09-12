import { useGenerationProgressStore } from './generation-progress-store';
import type { GenerationProgressState } from '../../components/generation-progress';

const progress: GenerationProgressState = {
  status: 'completed',
  totalDurationMs: 10,
  stages: [{ id: 'noise', name: 'Noise generation', status: 'completed', percentage: 100 }],
};

describe('useGenerationProgressStore', () => {
  beforeEach(() => {
    useGenerationProgressStore.getState().setProgress(undefined);
  });

  it('starts without progress', () => {
    expect(useGenerationProgressStore.getState().progress).toBeUndefined();
  });

  it('stores and clears progress', () => {
    useGenerationProgressStore.getState().setProgress(progress);
    expect(useGenerationProgressStore.getState().progress).toBe(progress);

    useGenerationProgressStore.getState().setProgress(undefined);
    expect(useGenerationProgressStore.getState().progress).toBeUndefined();
  });
});

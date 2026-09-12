import type { GenerationProgressState } from '../../components/generation-progress';
import { createStore } from '../create-store';

interface GenerationProgressStoreState {
  progress?: GenerationProgressState;
  setProgress: (progress: GenerationProgressState | undefined) => void;
}

export const useGenerationProgressStore = createStore<GenerationProgressStoreState>(set => ({
  setProgress: progress => set({ progress }),
}));

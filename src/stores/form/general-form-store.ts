import { createStore } from '../create-store';

export const DEFAULT_SEED = '123456';

export const GENERAL_FORM_DEFAULTS = { seed: DEFAULT_SEED };

interface GeneralFormState {
  seed: string;
  setSeed: (seed: string) => void;
}

export const useGeneralFormStore = createStore<GeneralFormState>(set => ({
  ...GENERAL_FORM_DEFAULTS,
  setSeed: seed => set({ seed }),
}));

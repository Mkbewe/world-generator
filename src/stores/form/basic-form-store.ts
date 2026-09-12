import { createStore } from '../create-store';

export const DEFAULT_SEED = '123456';

export const BASIC_FORM_DEFAULTS = { seed: DEFAULT_SEED };

interface BasicFormState {
  seed: string;
  setSeed: (seed: string) => void;
}

export const useBasicFormStore = createStore<BasicFormState>(set => ({
  ...BASIC_FORM_DEFAULTS,
  setSeed: seed => set({ seed }),
}));

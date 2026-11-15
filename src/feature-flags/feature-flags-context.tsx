import { createContext, type ReactNode, useContext, useMemo } from 'react';

import { FLAG_DEFAULTS, type FlagName, type Flags } from './flags';
import { readStoredFlags } from './read-stored-flags';

export const FeatureFlagsContext = createContext<Flags>(FLAG_DEFAULTS);

export function useFlag<K extends FlagName>(name: K): Flags[K] {
  return useContext(FeatureFlagsContext)[name];
}

export function FeatureFlagsProvider({ children }: { children: ReactNode }) {
  const flags = useMemo(() => readStoredFlags(), []);

  return <FeatureFlagsContext.Provider value={flags}>{children}</FeatureFlagsContext.Provider>;
}

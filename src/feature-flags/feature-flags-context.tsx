import { createContext, type ReactNode, useContext, useEffect, useState } from 'react';

import { FLAG_DEFAULTS, type FlagName, type Flags } from './flags';
import { resolveFlags } from './resolve-flags';

const FeatureFlagsContext = createContext<Flags>(FLAG_DEFAULTS);

export function useFlags(): Flags {
  return useContext(FeatureFlagsContext);
}

export function useFlag<K extends FlagName>(name: K): Flags[K] {
  return useContext(FeatureFlagsContext)[name];
}

export function FeatureFlagsProvider({ children }: { children: ReactNode }) {
  const [flags, setFlags] = useState<Flags>(FLAG_DEFAULTS);

  useEffect(() => {
    let ignore = false;

    fetch('/api/flags')
      .then(response => response.json())
      .then(remote => {
        if (!ignore) {
          setFlags(resolveFlags(remote));
        }
      })
      .catch((error: unknown) => {
        console.warn('Failed to load feature flags, using defaults.', error);
      });

    return () => {
      ignore = true;
    };
  }, []);

  return <FeatureFlagsContext.Provider value={flags}>{children}</FeatureFlagsContext.Provider>;
}

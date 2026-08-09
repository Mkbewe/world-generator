import { createContext, type ReactNode, useContext, useEffect, useState } from 'react';

import { FLAG_DEFAULTS, type FlagName, type Flags } from './flags';
import { resolveFlags } from './resolve-flags';

const STORAGE_KEY = 'feature-flags';

const FeatureFlagsContext = createContext<Flags>(FLAG_DEFAULTS);

export function useFlags(): Flags {
  return useContext(FeatureFlagsContext);
}

export function useFlag<K extends FlagName>(name: K): Flags[K] {
  return useContext(FeatureFlagsContext)[name];
}

function readCachedFlags(): Flags | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? resolveFlags(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

export function FeatureFlagsProvider({ children }: { children: ReactNode }) {
  const [flags, setFlags] = useState<Flags | null>(readCachedFlags);

  useEffect(() => {
    let ignore = false;

    fetch('/api/flags')
      .then(response => response.json())
      .then((remote: unknown) => {
        if (ignore) {
          return;
        }

        const resolved = resolveFlags(remote);
        setFlags(resolved);

        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(resolved));
        } catch {
          // Ignore storage failures (private mode, quota).
        }
      })
      .catch((error: unknown) => {
        if (!ignore) {
          setFlags(current => current ?? FLAG_DEFAULTS);
        }
        console.warn('Failed to load feature flags, using defaults.', error);
      });

    return () => {
      ignore = true;
    };
  }, []);

  if (flags === null) {
    return null;
  }

  return <FeatureFlagsContext.Provider value={flags}>{children}</FeatureFlagsContext.Provider>;
}

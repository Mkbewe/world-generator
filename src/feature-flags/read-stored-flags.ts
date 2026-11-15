import { FLAG_DEFAULTS, FLAG_OPTIONS, type Flags } from './flags';
import { resolveFlags } from './resolve-flags';

/** Browser storage entry with the local feature-flag overrides. */
export const FLAGS_STORAGE_KEY = 'feature-flags';

/** Reads local feature flags; a missing entry is initialized with the defaults. */
export function readStoredFlags(storage: Storage = window.localStorage): Flags {
  try {
    const raw = storage.getItem(FLAGS_STORAGE_KEY);
    if (raw !== null) {
      return resolveFlags(JSON.parse(raw), FLAG_DEFAULTS, FLAG_OPTIONS);
    }
    storage.setItem(FLAGS_STORAGE_KEY, JSON.stringify(FLAG_DEFAULTS));
    return FLAG_DEFAULTS;
  } catch {
    return FLAG_DEFAULTS;
  }
}

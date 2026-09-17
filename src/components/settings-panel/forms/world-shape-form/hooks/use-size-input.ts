import { useState } from 'react';

import { MAX_WORLD_SIZE, MIN_WORLD_SIZE, type WorldSize } from '../lib/world-shape';

interface SizeInput {
  readonly value: string;
  readonly setValue: (value: string) => void;
  readonly commit: () => void;
  readonly apply: (size: WorldSize) => void;
}

/** Keeps the custom size input in sync with the committed world size. */
export function useSizeInput(size: WorldSize, onSizeChange: (size: WorldSize) => void): SizeInput {
  const [value, setValue] = useState(String(size));

  const commit = (): void => {
    const parsed = Number(value);
    const next = Number.isInteger(parsed)
      ? Math.min(MAX_WORLD_SIZE, Math.max(MIN_WORLD_SIZE, parsed))
      : size;

    setValue(String(next));

    if (next !== size) {
      onSizeChange(next);
    }
  };

  const apply = (nextSize: WorldSize): void => {
    setValue(String(nextSize));
    onSizeChange(nextSize);
  };

  return { value, setValue, commit, apply };
}

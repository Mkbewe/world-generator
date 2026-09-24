import { useRef, useState } from 'react';

import {
  boundariesToShares,
  clampBoundaries,
} from '../../../../../utils/map-generator/stages/macro-region/boundary-model';

export interface BoundaryDraft {
  /** Cumulative boundaries including the local drag preview. */
  readonly boundaries: readonly number[];
  /** Region shares matching the previewed boundaries. */
  readonly shares: readonly number[];
  preview(index: number, percent: number): void;
  step(index: number, delta: number): void;
  commit(): void;
  cancel(): void;
}

/**
 * Keeps a boundary drag local until it is committed, so only the base region
 * section re-renders while the pointer moves. Keyboard steps commit at once.
 */
export function useBoundaryDraft(
  boundaries: readonly number[],
  regionCount: number,
  onChange: (boundaries: readonly number[]) => void
): BoundaryDraft {
  const [draft, setDraft] = useState<readonly number[]>();
  const pending = useRef<readonly number[] | undefined>(undefined);
  const shown = draft ?? boundaries;

  const update = (index: number, value: (current: number) => number): number[] => {
    const base = pending.current ?? boundaries;
    return clampBoundaries(
      base.map((boundary, position) => (position === index ? value(boundary) : boundary)),
      regionCount
    );
  };

  const clear = (): void => {
    pending.current = undefined;
    setDraft(undefined);
  };

  const preview = (index: number, percent: number): void => {
    const next = update(index, () => Math.round(percent));
    pending.current = next;
    setDraft(next);
  };

  const step = (index: number, delta: number): void => {
    const next = update(index, current => current + delta);
    clear();
    onChange(next);
  };

  const commit = (): void => {
    const committed = pending.current;
    clear();
    if (committed && !sameBoundaries(committed, boundaries)) {
      onChange(committed);
    }
  };

  return {
    boundaries: shown,
    shares: boundariesToShares(shown),
    preview,
    step,
    commit,
    cancel: clear,
  };
}

function sameBoundaries(a: readonly number[], b: readonly number[]): boolean {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

import { useRef, useState } from 'react';

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

/** Applies one boundary move to the draft; the caller owns the clamping rules. */
export type BoundaryMove = (
  base: readonly number[],
  index: number,
  value: (current: number) => number
) => number[];

/** Spatial shares of the regions between the given cumulative boundaries. */
export function boundariesToShares(boundaries: readonly number[]): number[] {
  const points = [0, ...boundaries, 100];
  return points.slice(1).map((point, index) => point - (points[index] ?? 0));
}

/**
 * Keeps a boundary drag local until it is committed, so only the distribution
 * bar re-renders while the pointer moves. Keyboard steps commit at once.
 */
export function useBoundaryDraft(
  boundaries: readonly number[],
  move: BoundaryMove,
  onCommit: (boundaries: readonly number[]) => void
): BoundaryDraft {
  const [draft, setDraft] = useState<readonly number[]>();
  const pending = useRef<readonly number[] | undefined>(undefined);
  const shown = draft ?? boundaries;
  const update = (index: number, value: (current: number) => number): number[] => {
    const base = pending.current ?? boundaries;
    return move(base, index, value);
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
    onCommit(next);
  };
  const commit = (): void => {
    const next = pending.current;
    clear();
    if (next && !same(next, boundaries)) {
      onCommit(next);
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

function same(left: readonly number[], right: readonly number[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

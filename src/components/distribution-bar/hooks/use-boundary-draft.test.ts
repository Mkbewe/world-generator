import { act, renderHook } from '@testing-library/react';

import { useBoundaryDraft } from './use-boundary-draft';
import { clampBoundaries } from '../../../utils/map-generator/stages/macro-region/editor/boundary-model';

const REGION_COUNT = 4;

function draftHook(
  boundaries: readonly number[],
  onCommit: (boundaries: readonly number[]) => void
) {
  return renderHook(() =>
    useBoundaryDraft(
      boundaries,
      (base, index, value) =>
        clampBoundaries(
          base.map((boundary, position) => (position === index ? value(boundary) : boundary)),
          REGION_COUNT
        ),
      onCommit
    )
  );
}

describe('useBoundaryDraft', () => {
  it('previews boundaries and shares without committing', () => {
    const onCommit = vi.fn();
    const { result } = draftHook([25, 50, 75], onCommit);

    act(() => result.current.preview(0, 40));

    expect(result.current.boundaries).toEqual([40, 50, 75]);
    expect(result.current.shares).toEqual([40, 10, 25, 25]);
    expect(onCommit).not.toHaveBeenCalled();
  });

  it('clamps the preview with the shared minimum share', () => {
    const { result } = draftHook([25, 50, 75], () => {});

    act(() => result.current.preview(0, 95));

    expect(result.current.boundaries).toEqual([76, 84, 92]);
  });

  it('commits the preview once, with the clamped values', () => {
    const onCommit = vi.fn();
    const { result } = draftHook([25, 50, 75], onCommit);

    act(() => result.current.preview(0, 30));
    act(() => result.current.preview(0, 40));
    act(() => result.current.commit());

    expect(onCommit).toHaveBeenCalledTimes(1);
    expect(onCommit).toHaveBeenCalledWith([40, 50, 75]);
    expect(result.current.boundaries).toEqual([25, 50, 75]);
  });

  it('skips the commit when nothing changed', () => {
    const onCommit = vi.fn();
    const { result } = draftHook([25, 50, 75], onCommit);

    act(() => result.current.commit());

    expect(onCommit).not.toHaveBeenCalled();
  });

  it('discards the preview on cancel', () => {
    const onCommit = vi.fn();
    const { result } = draftHook([25, 50, 75], onCommit);

    act(() => result.current.preview(0, 40));
    act(() => result.current.cancel());

    expect(result.current.boundaries).toEqual([25, 50, 75]);
    expect(onCommit).not.toHaveBeenCalled();
  });

  it('commits a keyboard step immediately', () => {
    const onCommit = vi.fn();
    const { result } = draftHook([25, 50, 75], onCommit);

    act(() => result.current.step(0, 1));

    expect(onCommit).toHaveBeenCalledWith([26, 50, 75]);
    expect(result.current.boundaries).toEqual([25, 50, 75]);
  });
});

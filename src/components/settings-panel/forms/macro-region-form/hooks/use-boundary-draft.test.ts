import { act, renderHook } from '@testing-library/react';

import { useBoundaryDraft } from './use-boundary-draft';

describe('useBoundaryDraft', () => {
  it('previews boundaries and shares without committing', () => {
    const onChange = vi.fn();
    const { result } = renderHook(() => useBoundaryDraft([25, 50, 75], 4, onChange));

    act(() => result.current.preview(0, 40));

    expect(result.current.boundaries).toEqual([40, 50, 75]);
    expect(result.current.shares).toEqual([40, 10, 25, 25]);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('clamps the preview with the shared minimum share', () => {
    const { result } = renderHook(() => useBoundaryDraft([25, 50, 75], 4, () => {}));

    act(() => result.current.preview(0, 95));

    expect(result.current.boundaries).toEqual([76, 84, 92]);
  });

  it('commits the preview once, with the clamped values', () => {
    const onChange = vi.fn();
    const { result } = renderHook(() => useBoundaryDraft([25, 50, 75], 4, onChange));

    act(() => result.current.preview(0, 30));
    act(() => result.current.preview(0, 40));
    act(() => result.current.commit());

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith([40, 50, 75]);
    expect(result.current.boundaries).toEqual([25, 50, 75]);
  });

  it('skips the commit when nothing changed', () => {
    const onChange = vi.fn();
    const { result } = renderHook(() => useBoundaryDraft([25, 50, 75], 4, onChange));

    act(() => result.current.commit());

    expect(onChange).not.toHaveBeenCalled();
  });

  it('discards the preview on cancel', () => {
    const onChange = vi.fn();
    const { result } = renderHook(() => useBoundaryDraft([25, 50, 75], 4, onChange));

    act(() => result.current.preview(0, 40));
    act(() => result.current.cancel());

    expect(result.current.boundaries).toEqual([25, 50, 75]);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('commits a keyboard step immediately', () => {
    const onChange = vi.fn();
    const { result } = renderHook(() => useBoundaryDraft([25, 50, 75], 4, onChange));

    act(() => result.current.step(0, 1));

    expect(onChange).toHaveBeenCalledWith([26, 50, 75]);
    expect(result.current.boundaries).toEqual([25, 50, 75]);
  });
});

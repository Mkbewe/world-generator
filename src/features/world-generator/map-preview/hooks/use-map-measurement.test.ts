import type { PointerSample } from '@readout';
import { act, fireEvent, renderHook } from '@testing-library/react';

import { useMapMeasurement } from './use-map-measurement';

function point(x: number): PointerSample {
  return { x, y: x, u: x / 10, v: x / 10 };
}

describe('useMapMeasurement', () => {
  it('adds points, previews the next segment and finishes the path', () => {
    const { result } = renderHook(() => useMapMeasurement({ active: true }));

    act(() => result.current.addPoint(point(1)));
    act(() => result.current.addPoint(point(2)));
    act(() => result.current.previewPoint(point(3)));

    expect(result.current.measurement).toEqual({
      points: [point(1), point(2)],
      preview: point(3),
    });

    act(() => result.current.finish());

    expect(result.current.measurement).toEqual({
      points: [point(1), point(2), point(3)],
      finished: true,
    });
  });

  it('undoes points with Backspace outside form fields', () => {
    const { result } = renderHook(() => useMapMeasurement({ active: true }));
    act(() => result.current.addPoint(point(1)));
    act(() => result.current.addPoint(point(2)));

    fireEvent.keyDown(window, { key: 'Backspace' });
    expect(result.current.measurement).toEqual({
      points: [point(1)],
      finished: false,
    });

    const input = document.createElement('input');
    document.body.append(input);
    fireEvent.keyDown(input, { key: 'Backspace' });
    expect(result.current.measurement?.points).toEqual([point(1)]);
    input.remove();
  });

  it('clears the preview and the whole path', () => {
    const { result } = renderHook(() => useMapMeasurement({ active: true }));
    act(() => result.current.addPoint(point(1)));
    act(() => result.current.previewPoint(point(2)));

    act(() => result.current.clearPreview());
    expect(result.current.measurement).toEqual({ points: [point(1)] });

    act(() => result.current.clear());
    expect(result.current.measurement).toBeUndefined();
  });
});

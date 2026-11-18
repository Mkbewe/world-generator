import type { MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from 'react';
import type { PointerSample } from '@readout';
import type { MapRenderer } from '@renderer';
import { act, renderHook } from '@testing-library/react';

import { useMapGestures } from './use-map-gestures';

function point(x: number): PointerSample {
  return { x, y: x, u: x / 10, v: x / 10 };
}

function pointerEvent(
  overrides: Partial<ReactPointerEvent<HTMLCanvasElement>> = {}
): ReactPointerEvent<HTMLCanvasElement> {
  return {
    button: 0,
    pointerId: 1,
    pointerType: 'mouse',
    clientX: 10,
    clientY: 10,
    currentTarget: { setPointerCapture: vi.fn() },
    preventDefault: vi.fn(),
    ...overrides,
  } as unknown as ReactPointerEvent<HTMLCanvasElement>;
}

function mouseEvent(): ReactMouseEvent<HTMLCanvasElement> {
  return { preventDefault: vi.fn() } as unknown as ReactMouseEvent<HTMLCanvasElement>;
}

function createPorts() {
  const readout = {
    sampleAt: vi.fn(() => point(1)),
    trackReadout: vi.fn(),
    togglePin: vi.fn(),
    clear: vi.fn(),
  };
  const measurement = {
    addPoint: vi.fn(),
    previewPoint: vi.fn(),
    finish: vi.fn(),
    clearPreview: vi.fn(),
  };
  const renderer = { panByPixels: vi.fn(), zoomAtPointer: vi.fn() };
  return { readout, measurement, renderer };
}

describe('useMapGestures', () => {
  it('pans between pointer down and up and clears the panning state', () => {
    const { readout, measurement, renderer } = createPorts();
    const { result } = renderHook(() =>
      useMapGestures({
        rendererRef: { current: renderer as unknown as MapRenderer },
        canvasRef: { current: null },
        zoomable: true,
        measuring: false,
        pinning: false,
        readout,
        measurement,
      })
    );

    act(() => result.current.handlers.onPointerDown(pointerEvent({ button: 1 })));
    act(() => result.current.handlers.onPointerMove(pointerEvent({ clientX: 30, clientY: 10 })));

    expect(result.current.panning).toBe(true);
    expect(renderer.panByPixels).toHaveBeenCalledWith(20, 0);
    expect(readout.trackReadout).toHaveBeenCalled();

    act(() => result.current.handlers.onPointerUp(pointerEvent({ button: 1, clientX: 30 })));

    expect(result.current.panning).toBe(false);
    expect(readout.togglePin).not.toHaveBeenCalled();
  });

  it('pins a tap and ignores a drag that started as a tap', () => {
    const { readout, measurement, renderer } = createPorts();
    const { result } = renderHook(() =>
      useMapGestures({
        rendererRef: { current: renderer as unknown as MapRenderer },
        canvasRef: { current: null },
        zoomable: true,
        measuring: false,
        pinning: true,
        readout,
        measurement,
      })
    );

    act(() => result.current.handlers.onPointerDown(pointerEvent()));
    act(() => result.current.handlers.onPointerUp(pointerEvent()));

    expect(readout.togglePin).toHaveBeenCalledWith(point(1));

    act(() => result.current.handlers.onPointerDown(pointerEvent({ pointerId: 2 })));
    act(() =>
      result.current.handlers.onPointerMove(
        pointerEvent({ pointerId: 2, clientX: 30, clientY: 10 })
      )
    );
    expect(readout.clear).not.toHaveBeenCalled();

    act(() => result.current.handlers.onPointerUp(pointerEvent({ pointerId: 2, clientX: 30 })));

    expect(readout.togglePin).toHaveBeenCalledOnce();
  });

  it('clears the live readout after a touch drag that does not pan', () => {
    const { readout, measurement, renderer } = createPorts();
    const { result } = renderHook(() =>
      useMapGestures({
        rendererRef: { current: renderer as unknown as MapRenderer },
        canvasRef: { current: null },
        zoomable: false,
        measuring: false,
        pinning: true,
        readout,
        measurement,
      })
    );

    act(() =>
      result.current.handlers.onPointerDown(
        pointerEvent({ pointerType: 'touch', clientX: 100, clientY: 100 })
      )
    );
    act(() =>
      result.current.handlers.onPointerMove(
        pointerEvent({ pointerType: 'touch', clientX: 130, clientY: 100 })
      )
    );
    act(() =>
      result.current.handlers.onPointerUp(
        pointerEvent({ pointerType: 'touch', clientX: 130, clientY: 100 })
      )
    );

    expect(readout.clear).toHaveBeenCalled();
    expect(readout.togglePin).not.toHaveBeenCalled();
  });

  it('clears the live readout after touch panning', () => {
    const { readout, measurement, renderer } = createPorts();
    const { result } = renderHook(() =>
      useMapGestures({
        rendererRef: { current: renderer as unknown as MapRenderer },
        canvasRef: { current: null },
        zoomable: true,
        measuring: false,
        pinning: true,
        readout,
        measurement,
      })
    );

    act(() =>
      result.current.handlers.onPointerDown(
        pointerEvent({ pointerType: 'touch', clientX: 100, clientY: 100 })
      )
    );
    act(() =>
      result.current.handlers.onPointerMove(
        pointerEvent({ pointerType: 'touch', clientX: 130, clientY: 100 })
      )
    );
    act(() =>
      result.current.handlers.onPointerUp(
        pointerEvent({ pointerType: 'touch', clientX: 130, clientY: 100 })
      )
    );

    expect(renderer.panByPixels).toHaveBeenCalledWith(30, 0);
    expect(readout.clear).toHaveBeenCalled();
    expect(readout.togglePin).not.toHaveBeenCalled();
  });

  it('zooms with two touch pointers without pinning', () => {
    const { readout, measurement, renderer } = createPorts();
    const { result } = renderHook(() =>
      useMapGestures({
        rendererRef: { current: renderer as unknown as MapRenderer },
        canvasRef: { current: null },
        zoomable: true,
        measuring: false,
        pinning: true,
        readout,
        measurement,
      })
    );

    act(() =>
      result.current.handlers.onPointerDown(
        pointerEvent({ pointerType: 'touch', pointerId: 1, clientX: 100, clientY: 100 })
      )
    );
    act(() =>
      result.current.handlers.onPointerDown(
        pointerEvent({ pointerType: 'touch', pointerId: 2, clientX: 200, clientY: 100 })
      )
    );
    act(() =>
      result.current.handlers.onPointerMove(
        pointerEvent({ pointerType: 'touch', pointerId: 2, clientX: 300, clientY: 100 })
      )
    );

    expect(renderer.zoomAtPointer).toHaveBeenCalledWith(200, 100, 2);

    act(() =>
      result.current.handlers.onPointerUp(
        pointerEvent({ pointerType: 'touch', pointerId: 2, clientX: 300, clientY: 100 })
      )
    );
    act(() =>
      result.current.handlers.onPointerUp(
        pointerEvent({ pointerType: 'touch', pointerId: 1, clientX: 100, clientY: 100 })
      )
    );

    expect(readout.togglePin).not.toHaveBeenCalled();
  });

  it('clears the live readout when a touch gesture is cancelled', () => {
    const { readout, measurement, renderer } = createPorts();
    const { result } = renderHook(() =>
      useMapGestures({
        rendererRef: { current: renderer as unknown as MapRenderer },
        canvasRef: { current: null },
        zoomable: false,
        measuring: false,
        pinning: true,
        readout,
        measurement,
      })
    );

    act(() =>
      result.current.handlers.onPointerDown(
        pointerEvent({ pointerType: 'touch', clientX: 100, clientY: 100 })
      )
    );
    act(() => result.current.handlers.onPointerCancel());

    expect(readout.clear).toHaveBeenCalledOnce();
    expect(readout.togglePin).not.toHaveBeenCalled();
  });

  it('ignores taps while the pin mode is off', () => {
    const { readout, measurement, renderer } = createPorts();
    const { result } = renderHook(() =>
      useMapGestures({
        rendererRef: { current: renderer as unknown as MapRenderer },
        canvasRef: { current: null },
        zoomable: true,
        measuring: false,
        pinning: false,
        readout,
        measurement,
      })
    );

    act(() => result.current.handlers.onPointerDown(pointerEvent()));
    act(() => result.current.handlers.onPointerUp(pointerEvent()));

    expect(readout.togglePin).not.toHaveBeenCalled();
  });

  it('moves measurement points and finishes them from the context menu', () => {
    const { readout, measurement, renderer } = createPorts();
    const { result } = renderHook(() =>
      useMapGestures({
        rendererRef: { current: renderer as unknown as MapRenderer },
        canvasRef: { current: null },
        zoomable: true,
        measuring: true,
        pinning: false,
        readout,
        measurement,
      })
    );

    act(() => result.current.handlers.onPointerDown(pointerEvent()));
    expect(measurement.addPoint).toHaveBeenCalledWith(point(1));

    act(() => result.current.handlers.onPointerMove(pointerEvent({ clientX: 30, clientY: 10 })));
    expect(measurement.previewPoint).toHaveBeenCalledWith(point(1));

    act(() => result.current.handlers.onPointerUp(pointerEvent({ clientX: 30 })));
    expect(measurement.finish).not.toHaveBeenCalled();

    act(() => result.current.handlers.onContextMenu(mouseEvent()));
    expect(measurement.finish).toHaveBeenCalledOnce();
  });

  it('clears measurement preview and readout on pointer cancel', () => {
    const { readout, measurement, renderer } = createPorts();
    const { result } = renderHook(() =>
      useMapGestures({
        rendererRef: { current: renderer as unknown as MapRenderer },
        canvasRef: { current: null },
        zoomable: true,
        measuring: true,
        pinning: false,
        readout,
        measurement,
      })
    );

    act(() => result.current.handlers.onPointerDown(pointerEvent()));
    act(() => result.current.handlers.onPointerCancel());

    expect(measurement.clearPreview).toHaveBeenCalledOnce();
    expect(readout.clear).toHaveBeenCalledOnce();
  });
});

import { Viewport } from './viewport';

function elementWithSize(width: number, height: number): HTMLElement {
  const element = document.createElement('div');
  element.getBoundingClientRect = () =>
    ({
      width,
      height,
      top: 0,
      left: 0,
      right: width,
      bottom: height,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    }) as DOMRect;
  return element;
}

let frames = new Map<number, FrameRequestCallback>();

function stubAnimationFrame(): void {
  frames = new Map();
  let nextId = 0;
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    nextId += 1;
    frames.set(nextId, callback);
    return nextId;
  });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => {
    frames.delete(id);
  });
}

function flushFrame(): void {
  const pending = [...frames.values()];
  frames.clear();
  for (const callback of pending) {
    callback(0);
  }
}

describe('Viewport', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('does not measure an element without size', () => {
    stubAnimationFrame();
    const viewport = new Viewport(elementWithSize(0, 0), vi.fn());
    expect(viewport.measure()).toBeUndefined();
    viewport.dispose();
  });

  it('measures size together with the device pixel ratio', () => {
    stubAnimationFrame();
    vi.stubGlobal('devicePixelRatio', 2);
    const viewport = new Viewport(elementWithSize(120, 80), vi.fn());
    expect(viewport.measure()).toEqual({ width: 120, height: 80, devicePixelRatio: 2 });
    viewport.dispose();
  });

  it('reports the measured size on the next frame after start', () => {
    stubAnimationFrame();
    const onResize = vi.fn();
    const viewport = new Viewport(elementWithSize(200, 100), onResize);
    viewport.start();
    expect(onResize).not.toHaveBeenCalled();
    flushFrame();
    expect(onResize).toHaveBeenCalledWith({
      width: 200,
      height: 100,
      devicePixelRatio: expect.any(Number),
    });
    viewport.dispose();
  });

  it('re-measures when a resize is observed', () => {
    stubAnimationFrame();
    let resize: ResizeObserverCallback | undefined;
    class FakeResizeObserver {
      constructor(callback: ResizeObserverCallback) {
        resize = callback;
      }
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    }
    vi.stubGlobal('ResizeObserver', FakeResizeObserver);
    const onResize = vi.fn();
    const viewport = new Viewport(elementWithSize(10, 10), onResize);
    viewport.start();
    flushFrame();
    onResize.mockClear();
    resize?.([], {} as ResizeObserver);
    flushFrame();
    expect(onResize).toHaveBeenCalledTimes(1);
    viewport.dispose();
  });

  it('cancels a pending measurement on dispose', () => {
    stubAnimationFrame();
    const onResize = vi.fn();
    const viewport = new Viewport(elementWithSize(10, 10), onResize);
    viewport.start();
    viewport.dispose();
    flushFrame();
    expect(onResize).not.toHaveBeenCalled();
  });

  it('disconnects the resize observer on dispose', () => {
    stubAnimationFrame();
    const disconnectSpy = vi.fn();
    class FakeResizeObserver {
      constructor(_callback: ResizeObserverCallback) {}
      observe(): void {}
      unobserve(): void {}
      disconnect = disconnectSpy;
    }
    vi.stubGlobal('ResizeObserver', FakeResizeObserver);
    const viewport = new Viewport(elementWithSize(10, 10), vi.fn());
    viewport.start();
    viewport.dispose();
    expect(disconnectSpy).toHaveBeenCalledOnce();
  });
});

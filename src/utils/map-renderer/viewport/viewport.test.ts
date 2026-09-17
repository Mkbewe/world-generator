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

function stubResizeObserver(): { resize: () => void } {
  let callback: ResizeObserverCallback | undefined;
  class FakeResizeObserver {
    constructor(next: ResizeObserverCallback) {
      callback = next;
    }
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  }
  vi.stubGlobal('ResizeObserver', FakeResizeObserver);
  return { resize: () => callback?.([], {} as ResizeObserver) };
}

describe('Viewport', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('does not measure an element without size', () => {
    const viewport = new Viewport(elementWithSize(0, 0), vi.fn());
    expect(viewport.measure()).toBeUndefined();
    viewport.dispose();
  });

  it('measures size together with the device pixel ratio', () => {
    vi.stubGlobal('devicePixelRatio', 2);
    const viewport = new Viewport(elementWithSize(120, 80), vi.fn());
    expect(viewport.measure()).toEqual({ width: 120, height: 80, devicePixelRatio: 2 });
    viewport.dispose();
  });

  it('reports the measured size as soon as it starts', () => {
    const onResize = vi.fn();
    const viewport = new Viewport(elementWithSize(200, 100), onResize);

    viewport.start();

    expect(onResize).toHaveBeenCalledWith({
      width: 200,
      height: 100,
      devicePixelRatio: expect.any(Number),
    });
    viewport.dispose();
  });

  it('re-measures synchronously when a resize is observed', () => {
    const observer = stubResizeObserver();
    const onResize = vi.fn();
    const viewport = new Viewport(elementWithSize(10, 10), onResize);
    viewport.start();
    onResize.mockClear();

    observer.resize();

    expect(onResize).toHaveBeenCalledWith({
      width: 10,
      height: 10,
      devicePixelRatio: expect.any(Number),
    });
    viewport.dispose();
  });

  it('disconnects the resize observer on dispose', () => {
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

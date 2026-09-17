import '@testing-library/jest-dom';

// jsdom lacks ResizeObserver, which Radix Themes components (e.g. Slider) rely on.
class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

globalThis.ResizeObserver = ResizeObserverStub;

// jsdom lacks matchMedia, which the fullscreen preview uses to detect mobile viewports.
function matchMediaStub(query: string): MediaQueryList {
  return {
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  } as unknown as MediaQueryList;
}

globalThis.matchMedia = matchMediaStub;

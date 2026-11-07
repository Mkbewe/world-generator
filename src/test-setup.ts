import '@testing-library/jest-dom';
import './i18n';

// jsdom lacks ResizeObserver, which Radix Themes components (e.g. Slider) rely on.
class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

globalThis.ResizeObserver = ResizeObserverStub;

// Node 26 ships an experimental `localStorage` global that shadows the jsdom one
// when Vitest copies the window keys onto globalThis.
const jsdomWindow = (globalThis as { jsdom?: { window: Window } }).jsdom?.window;
if (!globalThis.localStorage && jsdomWindow) {
  Object.defineProperty(globalThis, 'localStorage', {
    value: jsdomWindow.localStorage,
    configurable: true,
  });
}

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

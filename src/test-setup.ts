import '@testing-library/jest-dom';

// jsdom lacks ResizeObserver, which Radix Themes components (e.g. Slider) rely on.
class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

globalThis.ResizeObserver = ResizeObserverStub;

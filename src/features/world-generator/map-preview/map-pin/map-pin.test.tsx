import type { InspectorReadout } from '@readout';
import type { MapRenderer, ViewTransform } from '@renderer';
import { act, render } from '@testing-library/react';

import { MapPin } from './map-pin';
import { MapReadoutStore } from '../lib/map-readout-store';

const VIEW: ViewTransform = { scale: 1, centerX: 0.5, centerY: 0.5 };
const DIMENSIONS = {
  widthMeters: 4000,
  heightMeters: 4000,
  sampleWidth: 4,
  sampleHeight: 4,
};
const READOUT: InspectorReadout = {
  position: { x: 1, y: 2, u: 0.25, v: 0.5 },
};

interface RendererHandle {
  readonly rendererRef: { current: MapRenderer };
  readonly notifyView: (view: ViewTransform) => void;
}

function createRenderer(): RendererHandle {
  let listener: ((view: ViewTransform) => void) | undefined;
  return {
    rendererRef: {
      current: {
        subscribeView: (next: (view: ViewTransform) => void) => {
          listener = next;
          return () => {
            listener = undefined;
          };
        },
      } as unknown as MapRenderer,
    },
    notifyView: view => listener?.(view),
  };
}

function createContext(): CanvasRenderingContext2D {
  return {
    setTransform: vi.fn(),
    clearRect: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    beginPath: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
  } as unknown as CanvasRenderingContext2D;
}

function mockRect(width: number, height: number): void {
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
    left: 0,
    top: 0,
    width,
    height,
    right: width,
    bottom: height,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  } as DOMRect);
}

function renderPin(store: MapReadoutStore, width = 400, height = 400) {
  mockRect(width, height);
  const context = createContext();
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context);
  const container = document.createElement('div');
  document.body.appendChild(container);
  const containerRef = { current: container };
  const renderer = createRenderer();
  render(
    <MapPin
      store={store}
      containerRef={containerRef}
      rendererRef={renderer.rendererRef}
      viewTransform={VIEW}
      dimensions={DIMENSIONS}
    />
  );
  return { context, renderer };
}

describe('MapPin', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('draws the marker only while the readout is pinned', () => {
    const store = new MapReadoutStore();
    const { context } = renderPin(store);

    expect(context.arc).not.toHaveBeenCalled();

    act(() => store.setReadout(READOUT));
    expect(context.arc).not.toHaveBeenCalled();

    act(() => store.togglePinned(READOUT));
    expect(context.arc).toHaveBeenCalledTimes(2);

    const clears = vi.mocked(context.clearRect).mock.calls.length;
    act(() => store.togglePinned(READOUT));

    expect(vi.mocked(context.clearRect).mock.calls.length).toBeGreaterThan(clears);
    expect(context.arc).toHaveBeenCalledTimes(2);
  });

  it('redraws the marker when the renderer view changes', () => {
    const store = new MapReadoutStore();
    const { context, renderer } = renderPin(store);
    act(() => {
      store.setReadout(READOUT);
      store.togglePinned(READOUT);
    });
    const calls = vi.mocked(context.arc).mock.calls;
    const before = calls[calls.length - 1];

    act(() => renderer.notifyView({ scale: 2, centerX: 0.4, centerY: 0.5 }));
    const afterCalls = vi.mocked(context.arc).mock.calls;
    const after = afterCalls[afterCalls.length - 1];

    expect(after?.[0]).not.toBe(before?.[0]);
  });

  it('stays empty without a measurable map area', () => {
    const store = new MapReadoutStore();
    const { context } = renderPin(store, 0, 0);
    act(() => {
      store.setReadout(READOUT);
      store.togglePinned(READOUT);
    });

    expect(context.arc).not.toHaveBeenCalled();
  });
});

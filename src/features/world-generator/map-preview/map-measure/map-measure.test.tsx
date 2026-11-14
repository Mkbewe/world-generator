import type { Measurement } from '@readout';
import type { MapRenderer, ViewTransform } from '@renderer';
import { act, render, screen } from '@testing-library/react';

import { MapMeasure } from './map-measure';
import type { WorldDimensions } from '../../../../utils/world-dimensions';

const DIMENSIONS: WorldDimensions = {
  widthMeters: 1000,
  heightMeters: 1000,
  sampleWidth: 100,
  sampleHeight: 100,
};
const VIEW = { scale: 1, centerX: 0.5, centerY: 0.5 };
const START = { x: 25, y: 50, u: 0.25, v: 0.5 };
const MIDDLE = { x: 50, y: 50, u: 0.5, v: 0.5 };
const MEASUREMENT: Measurement = {
  points: [START, { x: 75, y: 50, u: 0.75, v: 0.5 }],
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
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    setLineDash: vi.fn(),
    fill: vi.fn(),
    arc: vi.fn(),
    fillText: vi.fn(),
    strokeText: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    globalAlpha: 1,
    lineWidth: 1,
    strokeStyle: '',
    fillStyle: '',
    font: '',
    textAlign: 'start',
    textBaseline: 'alphabetic',
    lineJoin: 'miter',
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

function renderMeasure(
  measurement?: Measurement,
  width = 400,
  height = 400
): {
  renderer: RendererHandle;
  context: CanvasRenderingContext2D;
  view: ReturnType<typeof render>;
} {
  mockRect(width, height);
  const context = createContext();
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context);
  const renderer = createRenderer();
  const container = document.createElement('div');
  document.body.appendChild(container);
  const view = render(
    <MapMeasure
      containerRef={{ current: container }}
      rendererRef={renderer.rendererRef}
      viewTransform={VIEW}
      dimensions={DIMENSIONS}
      measurement={measurement}
    />
  );
  return { renderer, context, view };
}

function startLabelCall(context: CanvasRenderingContext2D): [string, number, number] {
  const calls = vi.mocked(context.fillText).mock.calls;
  const call = calls.find(([text]) => text === '0 m');
  if (!call) {
    throw new Error('The start label was not drawn.');
  }
  return call as [string, number, number];
}

describe('MapMeasure', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('draws the line, ruler ticks, markers and both distances', () => {
    const { context, view } = renderMeasure(MEASUREMENT);

    expect(view.container.querySelector('canvas')).not.toBeNull();
    expect(context.fillText).toHaveBeenCalledWith('0 m', expect.any(Number), expect.any(Number));
    expect(context.fillText).toHaveBeenCalledWith('500 m', expect.any(Number), expect.any(Number));
    expect(context.arc).toHaveBeenCalledTimes(2);
    expect(context.stroke).toHaveBeenCalled();
  });

  it('draws every committed segment, marker and the path total', () => {
    const { context } = renderMeasure({
      points: [
        { x: 25, y: 25, u: 0.25, v: 0.25 },
        { x: 75, y: 25, u: 0.75, v: 0.25 },
        { x: 75, y: 75, u: 0.75, v: 0.75 },
      ],
    });

    expect(context.arc).toHaveBeenCalledTimes(3);
    expect(context.fillText).toHaveBeenCalledWith('1 km', expect.any(Number), expect.any(Number));
  });

  it('keeps the start label fixed while the preview turns', () => {
    const { context, renderer, view } = renderMeasure({
      points: [START, MIDDLE],
      preview: { x: 75, y: 25, u: 0.75, v: 0.25 },
    });
    const before = startLabelCall(context);

    view.rerender(
      <MapMeasure
        containerRef={{ current: view.container }}
        rendererRef={renderer.rendererRef}
        viewTransform={VIEW}
        dimensions={DIMENSIONS}
        measurement={{ points: [START, MIDDLE], preview: { x: 50, y: 75, u: 0.5, v: 0.75 } }}
      />
    );
    const after = startLabelCall(context);

    expect(after[1]).toBeCloseTo(before[1]);
    expect(after[2]).toBeCloseTo(before[2]);
  });

  it('draws the preview segment to the pointer', () => {
    const { context } = renderMeasure({
      points: [{ x: 25, y: 50, u: 0.25, v: 0.5 }],
      preview: { x: 75, y: 50, u: 0.75, v: 0.5 },
    });

    expect(context.arc).toHaveBeenCalledTimes(2);
    expect(context.fillText).toHaveBeenCalledWith('500 m', expect.any(Number), expect.any(Number));
  });

  it('redraws synchronously when the renderer view changes', () => {
    const { context, renderer } = renderMeasure(MEASUREMENT);
    const callsBefore = vi.mocked(context.clearRect).mock.calls.length;

    act(() => renderer.notifyView({ scale: 2, centerX: 0.5, centerY: 0.5 }));

    expect(vi.mocked(context.clearRect).mock.calls.length).toBeGreaterThan(callsBefore);
  });

  it('clears the canvas without a measurement', () => {
    const { context, view } = renderMeasure();

    expect(view.container.querySelector('canvas')).not.toBeNull();
    expect(context.clearRect).toHaveBeenCalled();
    expect(context.fillText).not.toHaveBeenCalled();
  });

  it('stays empty without a measurable map area', () => {
    const { context } = renderMeasure(MEASUREMENT, 0, 0);

    expect(context.fillText).not.toHaveBeenCalled();
  });

  it('exposes the measurement canvas to the preview', () => {
    const { view } = renderMeasure(MEASUREMENT);

    expect(screen.getByTestId('map-measure')).toBe(view.container.querySelector('canvas'));
  });
});

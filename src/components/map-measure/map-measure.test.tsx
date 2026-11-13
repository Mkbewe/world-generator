import type { Measurement } from '@readout';
import { render, screen } from '@testing-library/react';

import { MapMeasure } from './map-measure';
import type { WorldDimensions } from '../../utils/world-dimensions';

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

function renderMeasure(measurement?: Measurement) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const view = render(
    <MapMeasure
      containerRef={{ current: container }}
      viewTransform={VIEW}
      dimensions={DIMENSIONS}
      measurement={measurement}
    />
  );
  return view;
}

describe('MapMeasure', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('draws the line, ruler ticks, markers and both distances', () => {
    mockRect(400, 400);
    const { container } = renderMeasure(MEASUREMENT);

    const line = container.querySelector('line');
    expect(line).toHaveAttribute('x1', '102');
    expect(line).toHaveAttribute('y1', '200');
    expect(line).toHaveAttribute('x2', '298');
    expect(line).toHaveAttribute('y2', '200');
    expect(container.querySelectorAll('circle')).toHaveLength(2);
    expect(screen.getByText('0 m')).toBeInTheDocument();
    expect(screen.getAllByText('500 m')).toHaveLength(2);

    const ticks = [...container.querySelectorAll('line')].slice(1);
    expect(ticks.length).toBeGreaterThan(0);
    for (const tick of ticks) {
      expect(tick.getAttribute('x1')).toBe(tick.getAttribute('x2'));
    }
  });

  it('draws every committed segment, marker and the path total', () => {
    mockRect(400, 400);
    const { container } = renderMeasure({
      points: [
        { x: 25, y: 25, u: 0.25, v: 0.25 },
        { x: 75, y: 25, u: 0.75, v: 0.25 },
        { x: 75, y: 75, u: 0.75, v: 0.75 },
      ],
    });

    expect(container.querySelectorAll('circle')).toHaveLength(3);
    expect(container.querySelectorAll('line').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('1 km')).toBeInTheDocument();
  });

  it('keeps the start label fixed while the preview turns', () => {
    mockRect(400, 400);
    const container = document.createElement('div');
    document.body.appendChild(container);
    const props = {
      containerRef: { current: container },
      viewTransform: VIEW,
      dimensions: DIMENSIONS,
    };
    const points = [START, MIDDLE];
    const view = render(
      <MapMeasure
        {...props}
        measurement={{ points, preview: { x: 75, y: 25, u: 0.75, v: 0.25 } }}
      />
    );
    const before = screen.getByText('0 m');
    const beforeX = before.getAttribute('x');
    const beforeY = before.getAttribute('y');

    view.rerender(
      <MapMeasure {...props} measurement={{ points, preview: { x: 50, y: 75, u: 0.5, v: 0.75 } }} />
    );
    const after = screen.getByText('0 m');

    expect(after.getAttribute('x')).toBe(beforeX);
    expect(after.getAttribute('y')).toBe(beforeY);
  });

  it('draws the preview segment to the pointer', () => {
    mockRect(400, 400);
    const { container } = renderMeasure({
      points: [{ x: 25, y: 50, u: 0.25, v: 0.5 }],
      preview: { x: 75, y: 50, u: 0.75, v: 0.5 },
    });

    expect(container.querySelectorAll('circle')).toHaveLength(2);
    expect(screen.getAllByText('500 m')).toHaveLength(2);
  });

  it('stays hidden without a measurement', () => {
    mockRect(400, 400);
    const { container } = renderMeasure();

    expect(container.querySelector('svg')).toBeNull();
  });

  it('stays hidden without a measurable map area', () => {
    const { container } = renderMeasure(MEASUREMENT);

    expect(container.querySelector('svg')).toBeNull();
  });
});

import { render, screen } from '@testing-library/react';

import { MapMeasure } from './map-measure';
import type { Measurement } from '../../utils/map-readout';
import type { WorldDimensions } from '../../utils/world-dimensions';

const DIMENSIONS: WorldDimensions = {
  widthMeters: 1000,
  heightMeters: 1000,
  sampleWidth: 100,
  sampleHeight: 100,
};
const VIEW = { scale: 1, centerX: 0.5, centerY: 0.5 };
const MEASUREMENT: Measurement = {
  start: { x: 25, y: 50, u: 0.25, v: 0.5 },
  end: { x: 75, y: 50, u: 0.75, v: 0.5 },
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
    expect(screen.getByText('500 m')).toBeInTheDocument();

    const ticks = [...container.querySelectorAll('line')].slice(1);
    expect(ticks.length).toBeGreaterThan(0);
    for (const tick of ticks) {
      expect(tick.getAttribute('x1')).toBe(tick.getAttribute('x2'));
    }
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

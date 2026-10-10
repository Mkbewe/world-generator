import { render, screen } from '@testing-library/react';

import { ScaleBar } from './scale-bar';
import type { WorldDimensions } from '../../utils/world-dimensions';

const DIMENSIONS: WorldDimensions = {
  widthMeters: 1000,
  heightMeters: 1000,
  sampleWidth: 100,
  sampleHeight: 100,
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

function renderBar(zoom = 1) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  render(<ScaleBar containerRef={{ current: container }} zoom={zoom} dimensions={DIMENSIONS} />);
  return container;
}

describe('ScaleBar', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('draws a round distance for the measured map area', () => {
    mockRect(400, 400);
    renderBar();

    expect(screen.getByLabelText('Scale: 200 m')).toBeInTheDocument();
    expect(screen.getByText('200 m')).toBeInTheDocument();
  });

  it('shortens the distance when zoomed in', () => {
    mockRect(400, 400);
    renderBar(4);

    expect(screen.getByLabelText('Scale: 50 m')).toBeInTheDocument();
  });

  it('stays hidden without a measurable map area', () => {
    renderBar();

    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });
});

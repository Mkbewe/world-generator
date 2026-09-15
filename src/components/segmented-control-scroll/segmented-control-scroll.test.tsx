import { render, screen } from '@testing-library/react';

import { SegmentedControlScroll } from './segmented-control-scroll';

describe('SegmentedControlScroll', () => {
  it('renders its children inside the scrolling container', () => {
    render(
      <SegmentedControlScroll>
        <span>Radial</span>
      </SegmentedControlScroll>
    );

    expect(screen.getByText('Radial')).toBeInTheDocument();
  });
});

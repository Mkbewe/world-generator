import { Theme } from '@radix-ui/themes';
import { render, screen, within } from '@testing-library/react';

import { RegionDistribution } from './region-distribution';
import type { BoundaryDraft } from '../../../../distribution-bar';
import type { DistributionSegment } from '../../../../lib/distribution-segment';

const segments: readonly DistributionSegment[] = [
  { id: 'a', percent: 25 },
  { id: 'b', percent: 25 },
  { id: 'c', percent: 25 },
  { id: 'd', percent: 25 },
];

function createDraft(): BoundaryDraft {
  return {
    boundaries: [25, 50, 75],
    shares: [25, 25, 25, 25],
    preview: vi.fn(),
    step: vi.fn(),
    commit: vi.fn(),
    cancel: vi.fn(),
  };
}

describe('RegionDistribution', () => {
  it('renders the bar, one handle per boundary and the hint', () => {
    render(
      <Theme>
        <RegionDistribution
          segments={segments}
          draft={createDraft()}
          header={{ label: 'Ring thickness', description: 'Not an area share.' }}
        />
      </Theme>
    );

    expect(screen.getByLabelText('Region width distribution')).toBeInTheDocument();
    expect(within(screen.getByLabelText('Region boundaries')).getAllByRole('slider')).toHaveLength(
      3
    );
    expect(
      screen.getByText('Drag a boundary on the bar to resize the two neighbouring regions.')
    ).toBeInTheDocument();
    expect(screen.getByText('Ring thickness')).toBeInTheDocument();
  });
});

import { Theme } from '@radix-ui/themes';
import { render, screen, within } from '@testing-library/react';

import { RegionDistribution } from './region-distribution';
import type { MacroRegionSegment } from '../../../../../../utils/map-generator/stages/macro-region/boundary-model';
import type { BoundaryDraft } from '../../hooks/use-boundary-draft';

const segments: readonly MacroRegionSegment[] = [
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
        <RegionDistribution segments={segments} draft={createDraft()} />
      </Theme>
    );

    expect(screen.getByLabelText('Region width distribution')).toBeInTheDocument();
    expect(within(screen.getByLabelText('Region boundaries')).getAllByRole('slider')).toHaveLength(
      3
    );
    expect(screen.getByText(/drag a boundary/i)).toBeInTheDocument();
  });
});

import { Theme } from '@radix-ui/themes';
import { render, screen } from '@testing-library/react';

import { RegionDistribution } from './region-distribution';
import type { GeologicalRegionType } from '../../../../../utils/map-generator/types';
import type { BoundaryDraft } from '../../../../distribution-bar';
import type { DistributionSegment } from '../../../../lib/distribution-segment';

const SEGMENTS: readonly DistributionSegment[] = [
  { id: 'region-1', percent: 60 },
  { id: 'region-2', percent: 40 },
];

function createDraft(): BoundaryDraft {
  return {
    boundaries: [60],
    shares: [60, 40],
    preview: vi.fn(),
    step: vi.fn(),
    commit: vi.fn(),
    cancel: vi.fn(),
  };
}

function renderDistribution(types: readonly GeologicalRegionType[] = ['ordinary', 'atoll']) {
  render(
    <Theme>
      <RegionDistribution segments={SEGMENTS} draft={createDraft()} minShare={10} types={types} />
    </Theme>
  );
}

describe('RegionDistribution', () => {
  it('shows the region areas and one handle per boundary', () => {
    renderDistribution();

    expect(screen.getByLabelText('Geology region areas')).toBeInTheDocument();
    expect(screen.getByText('Area share')).toBeInTheDocument();
    expect(screen.getByTitle('Region 1: Ordinary (60%)')).toBeInTheDocument();
    expect(screen.getByTitle('Region 2: Atoll (40%)')).toBeInTheDocument();
    expect(screen.getAllByRole('slider')).toHaveLength(1);
  });

  it('explains how the areas are edited', () => {
    renderDistribution();

    expect(
      screen.getByText('Drag a boundary to change the area of the two neighbouring regions.')
    ).toBeInTheDocument();
  });
});

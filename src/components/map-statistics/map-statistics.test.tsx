import { Theme } from '@radix-ui/themes';
import { render, screen } from '@testing-library/react';

import { MapStatisticsPanel } from './map-statistics';
import type { WorldConfig } from '../../utils/map-generator';

const world: WorldConfig = {
  seed: 123456,
  width: 100,
  height: 50,
  shape: 'disc',
};

describe('MapStatisticsPanel', () => {
  it('renders the map summary', () => {
    render(
      <Theme>
        <MapStatisticsPanel world={world} />
      </Theme>
    );

    expect(screen.getByRole('heading', { name: 'Map' })).toBeInTheDocument();
    expect(screen.getByText('123456')).toBeInTheDocument();
    expect(screen.getByText('100 × 50')).toBeInTheDocument();
    expect(screen.getByText('disc')).toBeInTheDocument();
    expect(screen.getByText('5,000')).toBeInTheDocument();
  });
});

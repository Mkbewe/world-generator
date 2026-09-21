import { Theme } from '@radix-ui/themes';
import { render, screen } from '@testing-library/react';

import { MapStatisticsPanel } from './map-statistics';
import type { WorldConfig } from '../../utils/map-generator';

const world: WorldConfig = {
  dimensions: { widthMeters: 100, heightMeters: 50, sampleWidth: 100, sampleHeight: 50 },
  seed: 123456,
  shape: 'disc',
};

describe('MapStatisticsPanel', () => {
  it('renders the map summary', () => {
    render(
      <Theme>
        <MapStatisticsPanel world={world} totalDurationMs={1234} />
      </Theme>
    );

    expect(screen.getByRole('heading', { name: 'Map' })).toBeInTheDocument();
    expect(screen.getByText('123456')).toBeInTheDocument();
    expect(screen.getByText('100 × 50 m')).toBeInTheDocument();
    expect(screen.getByText('1 m')).toBeInTheDocument();
    expect(screen.getByText('0.005 km²')).toBeInTheDocument();
    expect(screen.getByText('disc')).toBeInTheDocument();
    expect(screen.getByText('5,000')).toBeInTheDocument();
    expect(screen.getByText('Total time')).toBeInTheDocument();
    expect(screen.getByText('1.23 s')).toBeInTheDocument();
  });

  it('formats a coarse world with its physical scale', () => {
    render(
      <Theme>
        <MapStatisticsPanel
          world={{
            dimensions: {
              widthMeters: 3000,
              heightMeters: 1500,
              sampleWidth: 150,
              sampleHeight: 75,
            },
            seed: 7,
            shape: 'rectangle',
          }}
          totalDurationMs={0}
        />
      </Theme>
    );

    expect(screen.getByText('3,000 × 1,500 m')).toBeInTheDocument();
    expect(screen.getByText('20 m')).toBeInTheDocument();
    expect(screen.getByText('4.5 km²')).toBeInTheDocument();
  });
});

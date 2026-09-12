import { Theme } from '@radix-ui/themes';
import { render, screen } from '@testing-library/react';

import { RenderStatisticsPanel } from './render-statistics';
import type { RenderStatistics } from '../../utils/map-renderer';

const statistics: RenderStatistics = {
  elapsedDurationMs: 1200,
  firstTileDurationMs: 250,
  viewport: { width: 640, height: 480, devicePixelRatio: 2 },
  overlayDurationMs: 12.5,
  presentationDurationMs: 7.5,
  layers: [
    {
      id: 'world-shape',
      name: 'World shape',
      durationMs: 30,
      tiles: 16,
      pixels: 1_000_000,
      bytes: 4_000_000,
    },
    { id: 'noise', name: 'Noise', durationMs: 20, tiles: 16, pixels: 2_000_000, bytes: 8_000_000 },
  ],
};

describe('RenderStatisticsPanel', () => {
  it('renders the render summary and layers', () => {
    render(
      <Theme>
        <RenderStatisticsPanel statistics={statistics} />
      </Theme>
    );

    expect(screen.getByRole('heading', { name: 'Rendering' })).toBeInTheDocument();
    expect(screen.getByText('640 × 480')).toBeInTheDocument();
    expect(screen.getByText('1.20 s')).toBeInTheDocument();
    expect(screen.getByText('250.0 ms')).toBeInTheDocument();
    expect(screen.getByText('30.00 ms/MPix')).toBeInTheDocument();
    expect(screen.getByText('10.00 ms/MPix')).toBeInTheDocument();
    expect(screen.getByText('World shape')).toBeInTheDocument();
    expect(screen.getByText('Noise')).toBeInTheDocument();
    expect(screen.getByText('Waiting and other work · 1.13 s')).toBeInTheDocument();
    expect(screen.getByTitle('Waiting and other work: 1.13 s')).toHaveStyle({
      width: `${(1130 / 1200) * 100}%`,
    });
  });

  it('shows missing measurements for cached layers and when no tile was drawn', () => {
    render(
      <Theme>
        <RenderStatisticsPanel
          statistics={{
            ...statistics,
            firstTileDurationMs: undefined,
            layers: [{ ...statistics.layers[0], durationMs: 0, tiles: 0, pixels: 0 }],
          }}
        />
      </Theme>
    );
    expect(screen.getAllByText('—')).toHaveLength(2);
    expect(screen.queryByText(/ms\/MPix/)).not.toBeInTheDocument();
  });
});

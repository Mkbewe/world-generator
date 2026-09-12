import { Theme } from '@radix-ui/themes';
import { render, screen } from '@testing-library/react';

import { RenderStatisticsPanel } from './render-statistics';
import type { RenderStatistics } from '../../utils/map-renderer';

const statistics: RenderStatistics = {
  totalDurationMs: 1200,
  viewport: { width: 640, height: 480, devicePixelRatio: 2 },
  overlayDurationMs: 12.5,
  layers: [
    { id: 'world-shape', name: 'World shape', durationMs: 30, tiles: 16, bytes: 2048 },
    { id: 'noise', name: 'Noise', durationMs: 20, tiles: 16, bytes: 2048 },
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
    expect(screen.getByText('World shape')).toBeInTheDocument();
    expect(screen.getByText('Noise')).toBeInTheDocument();
  });
});

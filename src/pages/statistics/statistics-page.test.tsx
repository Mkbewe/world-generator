import { MemoryRouter } from 'react-router';
import { Theme } from '@radix-ui/themes';
import { render, screen } from '@testing-library/react';

import { StatisticsPage } from './statistics-page';
import { useGenerationStatisticsStore } from '../../stores';
import type { StageStatistics } from '../../utils/map-generator';

function createStatistics(overrides: Partial<StageStatistics> = {}): StageStatistics {
  return {
    stageId: 'noise',
    stageName: 'Noise generation',
    status: 'completed',
    startedAt: 0,
    finishedAt: 20.4,
    durationMs: 20.4,
    ...overrides,
  };
}

function renderPage() {
  return render(
    <MemoryRouter>
      <Theme>
        <StatisticsPage />
      </Theme>
    </MemoryRouter>
  );
}

describe('StatisticsPage', () => {
  beforeEach(() => {
    useGenerationStatisticsStore.setState({ statistics: [], totalDurationMs: undefined });
  });

  it('renders an empty state when there are no statistics yet', () => {
    renderPage();

    expect(screen.getByRole('heading', { name: 'No statistics yet' })).toBeInTheDocument();
    expect(screen.getByText('Generate a world to see pipeline statistics.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to generator' })).toHaveAttribute('href', '/');
  });

  it('renders the statistics table when statistics are present', () => {
    useGenerationStatisticsStore.setState({
      statistics: [
        createStatistics({
          stageId: 'world-shape',
          stageName: 'World shape generation',
          durationMs: 12.5,
        }),
        createStatistics(),
      ],
      totalDurationMs: 30.0,
    });

    renderPage();

    expect(screen.getByRole('heading', { name: 'Statistics' })).toBeInTheDocument();
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getByText('World shape generation')).toBeInTheDocument();
    expect(screen.getByText('Noise generation')).toBeInTheDocument();
    expect(screen.getByText('12.5 ms')).toBeInTheDocument();
    expect(screen.getByText('30.0 ms')).toBeInTheDocument();
    expect(screen.getByText('Total')).toBeInTheDocument();
    expect(screen.queryByText('No statistics yet')).not.toBeInTheDocument();
  });
});

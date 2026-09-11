import { Theme } from '@radix-ui/themes';
import { render, screen } from '@testing-library/react';

import { GenerationStatistics } from './generation-statistics';
import type { GenerationSummary } from '../../stores';
import type { StageStatistics } from '../../utils/map-generator';

function createStatistics(overrides: Partial<StageStatistics> = {}): StageStatistics {
  return {
    stageId: 'world-shape',
    stageName: 'World shape generation',
    status: 'completed',
    startedAt: 0,
    finishedAt: 12.5,
    durationMs: 12.5,
    ...overrides,
  };
}

const summary: GenerationSummary = {
  seed: '123456',
  width: 100,
  height: 100,
  shape: 'disc',
  cells: 10000,
  bytes: 50000,
};

function renderStatistics(
  statistics: readonly StageStatistics[],
  options: { totalDurationMs?: number; summary?: GenerationSummary } = {}
) {
  return render(
    <Theme>
      <GenerationStatistics statistics={statistics} {...options} />
    </Theme>
  );
}

describe('GenerationStatistics', () => {
  it('always shows the heading', () => {
    renderStatistics([]);

    expect(screen.getByRole('heading', { name: 'Statistics' })).toBeInTheDocument();
  });

  it('renders the generation summary', () => {
    renderStatistics([createStatistics()], { summary, totalDurationMs: 42 });

    expect(screen.getByText('123456')).toBeInTheDocument();
    expect(screen.getByText('100 × 100')).toBeInTheDocument();
    expect(screen.getByText('disc')).toBeInTheDocument();
    expect(screen.getByText('10,000')).toBeInTheDocument();
    expect(screen.getByText('48.8 KB')).toBeInTheDocument();
    expect(screen.getByText('42.0 ms')).toBeInTheDocument();
  });

  it('renders stage names and durations', () => {
    renderStatistics([
      createStatistics({ stageId: 'world-shape', stageName: 'World shape generation' }),
      createStatistics({ stageId: 'noise', stageName: 'Noise generation', durationMs: 20.4 }),
    ]);

    expect(screen.getByText('World shape generation')).toBeInTheDocument();
    expect(screen.getByText('Noise generation')).toBeInTheDocument();
    expect(screen.getByText('12.5 ms')).toBeInTheDocument();
    expect(screen.getByText('20.4 ms')).toBeInTheDocument();
  });

  it('formats metrics using their descriptors', () => {
    renderStatistics([
      createStatistics({
        details: { coverage: 0.785, filledCells: 7850, mean: 0.5 },
      }),
    ]);

    expect(screen.getByText('Coverage')).toBeInTheDocument();
    expect(screen.getByText('78.5%')).toBeInTheDocument();
    expect(screen.getByText('Filled cells')).toBeInTheDocument();
    expect(screen.getByText('7,850')).toBeInTheDocument();
    expect(screen.getByText('Mean')).toBeInTheDocument();
    expect(screen.getByText('0.500')).toBeInTheDocument();
  });
});

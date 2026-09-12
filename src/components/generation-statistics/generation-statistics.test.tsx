import { Theme } from '@radix-ui/themes';
import { render, screen } from '@testing-library/react';

import { GenerationStatisticsPanel } from './generation-statistics';
import type { GenerationStatistics } from '../../stores';
import type { StageStatistics } from '../../utils/map-generator';

function createStage(overrides: Partial<StageStatistics> = {}): StageStatistics {
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

function renderPanel(result: GenerationStatistics) {
  return render(
    <Theme>
      <GenerationStatisticsPanel statistics={result} />
    </Theme>
  );
}

describe('GenerationStatisticsPanel', () => {
  it('shows the heading and the total time', () => {
    renderPanel({ statistics: [createStage()], totalDurationMs: 42 });

    expect(screen.getByRole('heading', { name: 'Generation' })).toBeInTheDocument();
    expect(screen.getByText('42.0 ms')).toBeInTheDocument();
  });

  it('sums the data produced by all stages', () => {
    renderPanel({
      statistics: [
        createStage({ stageId: 'world-shape', details: { bytes: 1024 } }),
        createStage({ stageId: 'noise', details: { bytes: 4096 } }),
        createStage({ stageId: 'other', details: { samples: 123 } }),
      ],
      totalDurationMs: 40,
    });

    expect(screen.getByText('Total data')).toBeInTheDocument();
    expect(screen.getByText('5.0 KB')).toBeInTheDocument();
  });

  it('renders stage names and durations', () => {
    renderPanel({
      statistics: [
        createStage({ stageId: 'world-shape', stageName: 'World shape generation' }),
        createStage({ stageId: 'noise', stageName: 'Noise generation', durationMs: 20.4 }),
      ],
      totalDurationMs: 40,
    });

    expect(screen.getByText('World shape generation')).toBeInTheDocument();
    expect(screen.getByText('Noise generation')).toBeInTheDocument();
    expect(screen.getByText('12.5 ms')).toBeInTheDocument();
    expect(screen.getByText('20.4 ms')).toBeInTheDocument();
  });

  it('formats metrics using their descriptors', () => {
    renderPanel({
      statistics: [createStage({ details: { coverage: 0.785, filledCells: 7850, mean: 0.5 } })],
      totalDurationMs: 40,
    });

    expect(screen.getByText('Coverage')).toBeInTheDocument();
    expect(screen.getByText('78.5%')).toBeInTheDocument();
    expect(screen.getByText('Filled cells')).toBeInTheDocument();
    expect(screen.getByText('7,850')).toBeInTheDocument();
    expect(screen.getByText('Mean')).toBeInTheDocument();
    expect(screen.getByText('0.500')).toBeInTheDocument();
  });
});

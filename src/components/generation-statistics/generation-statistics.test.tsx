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
    expect(screen.getByText('5.1 KB')).toBeInTheDocument();
  });

  it('keeps the real duration of reused stages and marks them', () => {
    renderPanel({
      statistics: [
        createStage({
          stageId: 'world-shape',
          stageName: 'World shape generation',
          status: 'skipped',
          durationMs: 1200,
          details: { bytes: 1024 },
        }),
        createStage({ stageId: 'macro-region', stageName: 'Macro region generation' }),
      ],
      totalDurationMs: 12.5,
    });

    expect(screen.getByText('1.20 s · reused')).toBeInTheDocument();
    expect(screen.getByText('Data')).toBeInTheDocument();
    expect(screen.getAllByText('1.0 KB')).toHaveLength(2);
    expect(screen.getByText('1.21 s')).toBeInTheDocument();
    expect(screen.getByTitle('World shape generation: 1.20 s')).not.toHaveAttribute(
      'data-muted',
      'true'
    );
  });

  it('marks a reused stage without any recorded duration', () => {
    renderPanel({
      statistics: [createStage({ status: 'skipped', durationMs: 0 })],
      totalDurationMs: 12.5,
    });

    expect(screen.getByText('reused')).toBeInTheDocument();
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

  it('formats macro-region counts as integers', () => {
    renderPanel({
      statistics: [
        createStage({
          stageId: 'macro-region',
          stageName: 'Macro region generation',
          details: {
            regions: 4,
            overlays: 0,
            deformationAmplitude: 0.08,
            deformationSource: 'dedicated',
          },
        }),
      ],
      totalDurationMs: 40,
    });

    expect(screen.getByText('Regions')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByText('Overlays')).toBeInTheDocument();
    expect(screen.getByText('0')).toBeInTheDocument();
    expect(screen.queryByText('4.000')).not.toBeInTheDocument();
    expect(screen.queryByText('0.000')).not.toBeInTheDocument();
    expect(screen.getByText('Deformation amplitude')).toBeInTheDocument();
    expect(screen.getByText('0.08')).toBeInTheDocument();
    expect(screen.getByText('Deformation source')).toBeInTheDocument();
    expect(screen.getByText('dedicated')).toBeInTheDocument();
  });
});

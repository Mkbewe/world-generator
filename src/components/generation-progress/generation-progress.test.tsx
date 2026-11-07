import { Theme } from '@radix-ui/themes';
import { render, screen } from '@testing-library/react';

import { GenerationProgress } from './generation-progress';
import type { GenerationProgressState } from '../../stores';

function renderProgress(progress: GenerationProgressState) {
  return render(
    <Theme>
      <GenerationProgress progress={progress} />
    </Theme>
  );
}

describe('GenerationProgress', () => {
  it('lists every stage with its duration', () => {
    renderProgress({
      status: 'completed',
      totalDurationMs: 460,
      stages: [
        {
          id: 'world-shape',
          nameKey: 'stages.worldShape',
          status: 'completed',
          percentage: 100,
          durationMs: 120,
        },
        {
          id: 'base-climate',
          nameKey: 'stages.baseClimate',
          status: 'completed',
          percentage: 100,
          durationMs: 340,
        },
      ],
    });

    expect(screen.getByText('World shape')).toBeInTheDocument();
    expect(screen.getByText('Base Climate')).toBeInTheDocument();
    expect(screen.getByText('120 ms')).toBeInTheDocument();
    expect(screen.getByText('340 ms')).toBeInTheDocument();
  });

  it('shows the overall count and the total time when complete', () => {
    renderProgress({
      status: 'completed',
      totalDurationMs: 1500,
      stages: [
        { id: 'world-shape', nameKey: 'stages.worldShape', status: 'completed', percentage: 100 },
        { id: 'base-climate', nameKey: 'stages.baseClimate', status: 'completed', percentage: 100 },
      ],
    });

    expect(screen.getByText('Complete')).toBeInTheDocument();
    expect(screen.getByText('2 / 2')).toBeInTheDocument();
    expect(screen.getByText('1.5 s')).toBeInTheDocument();
  });

  it('marks reused stages and mentions them in the counter', () => {
    renderProgress({
      status: 'completed',
      totalDurationMs: 460,
      stages: [
        {
          id: 'world-shape',
          nameKey: 'stages.worldShape',
          status: 'skipped',
          percentage: 0,
          durationMs: 0,
        },
        {
          id: 'base-climate',
          nameKey: 'stages.baseClimate',
          status: 'skipped',
          percentage: 0,
          durationMs: 0,
        },
        {
          id: 'macro-region',
          nameKey: 'stages.macroRegion',
          status: 'completed',
          percentage: 100,
          durationMs: 300,
        },
      ],
    });

    expect(screen.getByText('1 / 3, 2 skipped')).toBeInTheDocument();
    expect(screen.getAllByText('Skipped')).toHaveLength(2);
    expect(screen.getByText('300 ms')).toBeInTheDocument();
  });

  it('shows the failure state', () => {
    renderProgress({
      status: 'failed',
      stages: [
        { id: 'world-shape', nameKey: 'stages.worldShape', status: 'completed', percentage: 100 },
        { id: 'base-climate', nameKey: 'stages.baseClimate', status: 'failed', percentage: 0 },
      ],
    });

    expect(screen.getByText('Failed')).toBeInTheDocument();
    expect(screen.getByText('1 / 2')).toBeInTheDocument();
  });
});

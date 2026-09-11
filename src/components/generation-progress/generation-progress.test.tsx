import { Theme } from '@radix-ui/themes';
import { render, screen } from '@testing-library/react';

import { GenerationProgress, type GenerationProgressState } from './generation-progress';

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
          name: 'World shape generation',
          status: 'completed',
          percentage: 100,
          durationMs: 120,
        },
        {
          id: 'noise',
          name: 'Noise generation',
          status: 'completed',
          percentage: 100,
          durationMs: 340,
        },
      ],
    });

    expect(screen.getByText('World shape generation')).toBeInTheDocument();
    expect(screen.getByText('Noise generation')).toBeInTheDocument();
    expect(screen.getByText('120 ms')).toBeInTheDocument();
    expect(screen.getByText('340 ms')).toBeInTheDocument();
  });

  it('shows the overall count and the total time when complete', () => {
    renderProgress({
      status: 'completed',
      totalDurationMs: 1500,
      stages: [
        { id: 'world-shape', name: 'World shape', status: 'completed', percentage: 100 },
        { id: 'noise', name: 'Noise', status: 'completed', percentage: 100 },
      ],
    });

    expect(screen.getByText('Complete')).toBeInTheDocument();
    expect(screen.getByText('2 / 2')).toBeInTheDocument();
    expect(screen.getByText('1.5 s')).toBeInTheDocument();
  });

  it('shows live progress and failure state', () => {
    renderProgress({
      status: 'failed',
      stages: [
        { id: 'world-shape', name: 'World shape', status: 'completed', percentage: 100 },
        { id: 'noise', name: 'Noise', status: 'failed', percentage: 0 },
      ],
    });

    expect(screen.getByText('Failed')).toBeInTheDocument();
    expect(screen.getByText('1 / 2')).toBeInTheDocument();
  });
});

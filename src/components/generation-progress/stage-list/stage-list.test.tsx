import { Theme } from '@radix-ui/themes';
import { render, screen } from '@testing-library/react';

import { StageList } from './stage-list';
import type { GenerationStageProgress } from '../lib/progress-types';

const stages: readonly GenerationStageProgress[] = [
  { id: 'a', name: 'World shape', status: 'completed', percentage: 100, durationMs: 120 },
  { id: 'b', name: 'Noise', status: 'running', percentage: 40 },
  { id: 'c', name: 'Macro regions', status: 'skipped', percentage: 0, durationMs: 0 },
];

describe('StageList', () => {
  it('lists every stage name and the duration when it was reported', () => {
    render(
      <Theme>
        <StageList stages={stages} />
      </Theme>
    );

    expect(screen.getByText('World shape')).toBeInTheDocument();
    expect(screen.getByText('120 ms')).toBeInTheDocument();
    expect(screen.getByTitle('Noise')).toBeInTheDocument();
    expect(screen.queryByText('40 ms')).toBeNull();
  });

  it('marks reused stages instead of showing their zero duration', () => {
    render(
      <Theme>
        <StageList stages={stages} />
      </Theme>
    );

    expect(screen.getByText('Skipped')).toBeInTheDocument();
    expect(screen.queryByText('0 ms')).toBeNull();
  });
});

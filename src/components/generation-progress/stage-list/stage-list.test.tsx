import { Theme } from '@radix-ui/themes';
import { render, screen } from '@testing-library/react';

import { StageList } from './stage-list';
import type { GenerationStageProgress } from '../../../stores';

const stages: readonly GenerationStageProgress[] = [
  { id: 'a', nameKey: 'stages.worldShape', status: 'completed', percentage: 100, durationMs: 120 },
  { id: 'b', nameKey: 'stages.baseClimate', status: 'running', percentage: 40 },
  { id: 'c', nameKey: 'stages.macroRegion', status: 'skipped', percentage: 0, durationMs: 0 },
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
    expect(screen.getByTitle('Base Climate')).toBeInTheDocument();
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

import { Theme } from '@radix-ui/themes';
import { render, screen } from '@testing-library/react';

import { StageList } from './stage-list';
import { buildProgressViewModel, type ProgressSource } from '../lib/progress-view-model';

const SOURCE: ProgressSource = {
  status: 'running',
  stages: [
    {
      id: 'a',
      nameKey: 'stages.worldShape',
      status: 'completed',
      percentage: 100,
      durationMs: 120,
    },
    { id: 'b', nameKey: 'stages.baseClimate', status: 'running', percentage: 40 },
    {
      id: 'c',
      nameKey: 'stages.macroRegion',
      status: 'skipped',
      percentage: 0,
      durationMs: 0,
    },
  ],
};

const TEN_STAGE_SOURCE: ProgressSource = {
  status: 'running',
  stages: [
    { id: 'a', nameKey: 'stages.worldShape', status: 'completed', percentage: 100 },
    { id: 'b', nameKey: 'stages.macroRegion', status: 'completed', percentage: 100 },
    { id: 'c', nameKey: 'stages.baseClimate', status: 'running', percentage: 60 },
    { id: 'd', nameKey: 'stages.geology', status: 'failed', percentage: 0 },
    { id: 'e', nameKey: 'stages.heightmap', status: 'skipped', percentage: 0 },
    { id: 'f', nameKey: 'stages.worldShape', status: 'pending', percentage: 0 },
    { id: 'g', nameKey: 'stages.macroRegion', status: 'pending', percentage: 0 },
    { id: 'h', nameKey: 'stages.baseClimate', status: 'pending', percentage: 0 },
    { id: 'i', nameKey: 'stages.geology', status: 'pending', percentage: 0 },
    { id: 'j', nameKey: 'stages.heightmap', status: 'pending', percentage: 0 },
  ],
};

const STAGES = buildProgressViewModel(SOURCE).stages;
const TEN_STAGES = buildProgressViewModel(TEN_STAGE_SOURCE).stages;

describe('StageList', () => {
  it('lists every stage name and the duration when it was reported', () => {
    render(
      <Theme>
        <StageList stages={STAGES} />
      </Theme>
    );

    expect(screen.getByText('World shape')).toBeInTheDocument();
    expect(screen.getByText('120 ms')).toBeInTheDocument();
    expect(screen.getByText('Base Climate')).toBeInTheDocument();
    expect(screen.getByText('1.')).toBeInTheDocument();
    expect(screen.getByText('2.')).toBeInTheDocument();
    expect(screen.getByText('3.')).toBeInTheDocument();
    expect(screen.queryByText('40 ms')).toBeNull();
  });

  it('marks reused stages instead of showing their zero duration', () => {
    render(
      <Theme>
        <StageList stages={STAGES} />
      </Theme>
    );

    expect(screen.getByText('skipped')).toBeInTheDocument();
    expect(screen.queryByText('0 ms')).toBeNull();
  });

  it.each([
    ['narrow', 320],
    ['wide', 960],
  ])('renders all ten stages in a %s container', (_label, width) => {
    const { container } = render(
      <Theme>
        <div style={{ width }}>
          <StageList stages={TEN_STAGES} />
        </div>
      </Theme>
    );

    expect(container.querySelectorAll('[data-status]')).toHaveLength(10);
    expect(container.querySelector('[aria-current="step"]')).toHaveTextContent('Base Climate');
    for (const status of ['running', 'completed', 'skipped', 'failed']) {
      expect(container.querySelector(`[data-status="${status}"]`)).not.toBeNull();
    }
  });
});

import { render } from '@testing-library/react';

import { StageBars } from './stage-bars';
import { buildProgressViewModel, type ProgressSource } from '../lib/progress-view-model';

const SOURCE: ProgressSource = {
  status: 'running',
  stages: [
    { id: 'a', nameKey: 'stages.worldShape', status: 'pending', percentage: 0 },
    { id: 'b', nameKey: 'stages.worldShape', status: 'running', percentage: 40 },
    { id: 'c', nameKey: 'stages.worldShape', status: 'completed', percentage: 100 },
    { id: 'd', nameKey: 'stages.worldShape', status: 'failed', percentage: 0 },
    { id: 'e', nameKey: 'stages.worldShape', status: 'skipped', percentage: 0 },
  ],
};

const TEN_STAGE_SOURCE: ProgressSource = {
  status: 'running',
  stages: [
    { id: 'a', nameKey: 'stages.worldShape', status: 'completed', percentage: 100 },
    { id: 'b', nameKey: 'stages.macroRegion', status: 'completed', percentage: 100 },
    { id: 'c', nameKey: 'stages.baseClimate', status: 'running', percentage: 60 },
    { id: 'd', nameKey: 'stages.geology', status: 'skipped', percentage: 0 },
    { id: 'e', nameKey: 'stages.heightmap', status: 'failed', percentage: 0 },
    { id: 'f', nameKey: 'stages.worldShape', status: 'pending', percentage: 0 },
    { id: 'g', nameKey: 'stages.macroRegion', status: 'pending', percentage: 0 },
    { id: 'h', nameKey: 'stages.baseClimate', status: 'pending', percentage: 0 },
    { id: 'i', nameKey: 'stages.geology', status: 'pending', percentage: 0 },
    { id: 'j', nameKey: 'stages.heightmap', status: 'pending', percentage: 0 },
  ],
};

describe('StageBars', () => {
  it('renders one bar per stage with a width for its status', () => {
    const { container } = render(
      <StageBars stages={buildProgressViewModel(SOURCE).stages} complete={false} />
    );

    const bars = container.querySelectorAll('[data-status]');
    expect(bars).toHaveLength(5);
    expect(container.querySelector('[data-status="pending"]')).toHaveTextContent('');
    expect(container.querySelector('[data-status="running"]')).toHaveTextContent('');
    expect(container.querySelector('[data-status="completed"]')).toHaveTextContent('completed');
    expect(container.querySelector('[data-status="failed"]')).toHaveTextContent('');
    expect(container.querySelector('[data-status="skipped"]')).toHaveTextContent('skipped');
    const widths = [
      ...container.querySelectorAll<HTMLElement>('[data-status] > div:first-child'),
    ].map(fill => fill.style.width);
    expect(widths).toEqual(['0%', '40%', '100%', '100%', '100%']);
  });

  it('keeps the completed and skipped copy in the segments', () => {
    const { container } = render(
      <StageBars stages={buildProgressViewModel(TEN_STAGE_SOURCE).stages} complete={false} />
    );

    expect(container.querySelectorAll('[data-status]')).toHaveLength(10);
    expect(container.querySelector('[data-status="running"]')).toHaveTextContent('');
    expect(container.querySelector('[data-status="completed"]')).toHaveTextContent('completed');
    expect(container.querySelector('[data-status="skipped"]')).toHaveTextContent('skipped');
    expect(container.querySelector('[data-status="failed"]')).toHaveTextContent('');
  });

  it('marks the bar row as complete only for a completed run', () => {
    const running = render(
      <StageBars stages={buildProgressViewModel(SOURCE).stages} complete={false} />
    );
    expect(running.container.querySelector('[data-complete="true"]')).toBeNull();

    const completed = render(<StageBars stages={buildProgressViewModel(SOURCE).stages} complete />);
    expect(completed.container.querySelector('[data-complete="true"]')).not.toBeNull();
  });
});

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

describe('StageBars', () => {
  it('renders one bar per stage with a width for its status', () => {
    const { container } = render(
      <StageBars stages={buildProgressViewModel(SOURCE).stages} complete={false} />
    );

    const bars = container.querySelectorAll('[data-status]');
    expect(bars).toHaveLength(5);
    const widths = [...container.querySelectorAll<HTMLElement>('[data-status] > div')].map(
      fill => fill.style.width
    );
    expect(widths).toEqual(['0%', '40%', '100%', '100%', '100%']);
  });

  it('labels completed and reused stages inside their bar', () => {
    const { container } = render(
      <StageBars stages={buildProgressViewModel(SOURCE).stages} complete />
    );

    const completed = container.querySelector('[data-status="completed"]');
    const skipped = container.querySelector('[data-status="skipped"]');
    expect(completed?.textContent).toBe('completed');
    expect(skipped?.textContent).toBe('skipped');
    expect(container.querySelector('[data-status="running"]')?.textContent).toBe('');
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

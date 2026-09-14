import { render } from '@testing-library/react';

import { StageBars } from './stage-bars';
import type { GenerationStageProgress } from '../lib/progress-types';

const stages: readonly GenerationStageProgress[] = [
  { id: 'a', name: 'Pending', status: 'pending', percentage: 0 },
  { id: 'b', name: 'Running', status: 'running', percentage: 40 },
  { id: 'c', name: 'Completed', status: 'completed', percentage: 100 },
  { id: 'd', name: 'Failed', status: 'failed', percentage: 0 },
];

describe('StageBars', () => {
  it('renders one bar per stage with a width for its status', () => {
    const { container } = render(<StageBars stages={stages} status='running' />);

    const bars = container.querySelectorAll('[data-status]');
    expect(bars).toHaveLength(4);
    const widths = [...container.querySelectorAll<HTMLElement>('[data-status] > div')].map(
      fill => fill.style.width
    );
    expect(widths).toEqual(['0%', '40%', '100%', '100%']);
  });

  it('marks the bar row as complete only for a completed run', () => {
    const running = render(<StageBars stages={stages} status='running' />);
    expect(running.container.querySelector('[data-complete="true"]')).toBeNull();

    const completed = render(<StageBars stages={stages} status='completed' />);
    expect(completed.container.querySelector('[data-complete="true"]')).not.toBeNull();
  });
});

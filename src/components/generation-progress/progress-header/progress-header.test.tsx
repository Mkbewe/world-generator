import { Theme } from '@radix-ui/themes';
import { render, screen } from '@testing-library/react';

import { ProgressHeader } from './progress-header';

describe('ProgressHeader', () => {
  it('shows the status, count and formatted time', () => {
    render(
      <Theme>
        <ProgressHeader status='running' completed={1} total={3} time={1500} />
      </Theme>
    );

    expect(screen.getByText('Generating')).toBeInTheDocument();
    expect(screen.getByText('1 / 3')).toBeInTheDocument();
    expect(screen.getByText('1.5 s')).toBeInTheDocument();
  });

  it('shows the failed state with milliseconds', () => {
    render(
      <Theme>
        <ProgressHeader status='failed' completed={1} total={2} time={340} />
      </Theme>
    );

    expect(screen.getByText('Failed')).toBeInTheDocument();
    expect(screen.getByText('1 / 2')).toBeInTheDocument();
    expect(screen.getByText('340 ms')).toBeInTheDocument();
  });
});

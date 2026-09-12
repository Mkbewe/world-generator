import { Theme } from '@radix-ui/themes';
import { render, screen } from '@testing-library/react';

import { StatisticsPanel } from './statistics-panel';

describe('StatisticsPanel', () => {
  it('renders the title, summary, timing and sections', () => {
    render(
      <Theme>
        <StatisticsPanel
          title='Statistics'
          summary={[{ label: 'Seed', value: '1', description: 'Seed.' }]}
          timing={[{ key: 'a', label: 'Alpha', durationMs: 10 }]}
          sections={[{ key: 'a', title: 'Alpha', trailing: '10.0 ms', metrics: [] }]}
        />
      </Theme>
    );

    expect(screen.getByRole('heading', { name: 'Statistics' })).toBeInTheDocument();
    expect(screen.getByText('Seed')).toBeInTheDocument();
    expect(screen.getByText('Timing')).toBeInTheDocument();
    expect(screen.getByText('Alpha · 10.0 ms')).toBeInTheDocument();
    expect(screen.getByText('Alpha')).toBeInTheDocument();
  });
});

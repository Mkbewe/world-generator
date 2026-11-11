import { Theme } from '@radix-ui/themes';
import { render, screen } from '@testing-library/react';

import { StatisticsPanel } from './statistics-panel';

describe('StatisticsPanel', () => {
  it('renders the title, summary, timing and sections', () => {
    render(
      <Theme>
        <StatisticsPanel
          model={{
            titleKey: 'statistics.generation.title',
            summary: [
              {
                key: 'seed',
                labelKey: 'statistics.map.seed',
                descriptionKey: 'statistics.map.seedDescription',
                value: '1',
              },
            ],
            timing: [{ key: 'a', nameKey: 'stages.worldShape', durationMs: 10 }],
            unmeasuredDurationMs: 125,
            sections: [
              {
                key: 'a',
                titleKey: 'stages.worldShape',
                durationMs: 10,
                metrics: [],
              },
            ],
          }}
        />
      </Theme>
    );

    expect(screen.getByRole('heading', { name: 'Generation' })).toBeInTheDocument();
    expect(screen.getByText('Seed')).toBeInTheDocument();
    expect(screen.getByText('Timing')).toBeInTheDocument();
    expect(screen.getByText('World shape · 10.0 ms')).toBeInTheDocument();
    expect(screen.getByText(/125\.0 ms/)).toBeInTheDocument();
    expect(screen.getByText('World shape')).toBeInTheDocument();
  });
});

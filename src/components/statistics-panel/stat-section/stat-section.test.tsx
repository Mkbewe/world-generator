import { Theme } from '@radix-ui/themes';
import { render, screen } from '@testing-library/react';

import { StatSection } from './stat-section';
import type { StatisticsSection } from '../types';

const section: StatisticsSection = {
  key: 'noise',
  titleKey: 'stages.worldShape',
  durationMs: 20,
  metrics: [
    {
      key: 'mean',
      labelKey: 'statistics.metrics.mean',
      value: '0.500',
      descriptionKey: 'statistics.metrics.meanDescription',
    },
    {
      key: 'cells',
      labelKey: 'statistics.metrics.cells',
      value: '2,000',
      descriptionKey: 'statistics.metrics.cellsDescription',
    },
  ],
};

describe('StatSection', () => {
  it('renders the title, trailing value and metrics', () => {
    render(
      <Theme>
        <StatSection section={section} />
      </Theme>
    );

    expect(screen.getByText('World shape')).toBeInTheDocument();
    expect(screen.getByText('20.0 ms')).toBeInTheDocument();
    expect(screen.getByText('Mean height')).toBeInTheDocument();
    expect(screen.getByText('0.500')).toBeInTheDocument();
    expect(screen.getByText('Cells')).toBeInTheDocument();
    expect(screen.getByText('2,000')).toBeInTheDocument();
  });

  it('keeps the real duration of a reused section and marks it', () => {
    render(
      <Theme>
        <StatSection section={{ ...section, reused: true }} />
      </Theme>
    );

    expect(screen.getByText('20.0 ms · reused')).toBeInTheDocument();
  });

  it('shows only the reused marker when the recorded duration is zero', () => {
    render(
      <Theme>
        <StatSection section={{ ...section, reused: true, durationMs: 0 }} />
      </Theme>
    );

    expect(screen.getByText('reused')).toBeInTheDocument();
  });
});

import { Theme } from '@radix-ui/themes';
import { render, screen } from '@testing-library/react';

import { StatSection } from './stat-section';
import type { StatisticsSection } from '../types';

const section: StatisticsSection = {
  key: 'noise',
  title: 'Noise generation',
  trailing: '20.0 ms',
  metrics: [
    { label: 'Mean', value: '0.500', description: 'Average noise value.' },
    { label: 'Samples', value: '2,000', description: 'Number of samples.' },
  ],
};

describe('StatSection', () => {
  it('renders the title, trailing value and metrics', () => {
    render(
      <Theme>
        <StatSection section={section} />
      </Theme>
    );

    expect(screen.getByText('Noise generation')).toBeInTheDocument();
    expect(screen.getByText('20.0 ms')).toBeInTheDocument();
    expect(screen.getByText('Mean')).toBeInTheDocument();
    expect(screen.getByText('0.500')).toBeInTheDocument();
    expect(screen.getByText('Samples')).toBeInTheDocument();
    expect(screen.getByText('2,000')).toBeInTheDocument();
  });
});

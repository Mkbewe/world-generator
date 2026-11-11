import { Theme } from '@radix-ui/themes';
import { render, screen } from '@testing-library/react';

import { SummaryGrid } from './summary-grid';
import type { StatisticsMetric } from '../types';

const items: StatisticsMetric[] = [
  {
    key: 'seed',
    labelKey: 'statistics.map.seed',
    value: '123456',
    descriptionKey: 'statistics.map.seedDescription',
  },
  {
    key: 'cells',
    labelKey: 'statistics.map.cells',
    value: '5,000',
    descriptionKey: 'statistics.map.cellsDescription',
  },
];

describe('SummaryGrid', () => {
  it('renders each summary item', () => {
    render(
      <Theme>
        <SummaryGrid items={items} />
      </Theme>
    );

    expect(screen.getByText('Seed')).toBeInTheDocument();
    expect(screen.getByText('123456')).toBeInTheDocument();
    expect(screen.getByText('Cells')).toBeInTheDocument();
    expect(screen.getByText('5,000')).toBeInTheDocument();
  });
});

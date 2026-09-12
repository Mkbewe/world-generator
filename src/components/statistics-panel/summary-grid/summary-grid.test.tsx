import { Theme } from '@radix-ui/themes';
import { render, screen } from '@testing-library/react';

import { SummaryGrid } from './summary-grid';
import type { StatisticsSummaryItem } from '../types';

const items: StatisticsSummaryItem[] = [
  { label: 'Seed', value: '123456', description: 'Seed.' },
  { label: 'Cells', value: '5,000', description: 'Cells.' },
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

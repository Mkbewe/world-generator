import { Theme } from '@radix-ui/themes';
import { render, screen } from '@testing-library/react';

import { GridSummaryField } from './grid-summary-field';

function renderSummary(sizeMeters: number, metersPerSample: number) {
  render(
    <Theme>
      <GridSummaryField sizeMeters={sizeMeters} metersPerSample={metersPerSample} />
    </Theme>
  );
}

describe('GridSummaryField', () => {
  it('shows the derived grid and the estimated memory', () => {
    renderSummary(1000, 1);

    expect(screen.getByText('1000 × 1000 samples · 6 MB data')).toBeInTheDocument();
    expect(screen.queryByText(/sample budget/i)).toBeNull();
  });

  it('warns when the sample budget clamps the requested detail', () => {
    renderSummary(10_000, 0.5);

    expect(screen.getByText('10000 × 10000 samples · 600 MB data')).toBeInTheDocument();
    expect(screen.getByText(/limited to 1.0 m per sample/i)).toBeInTheDocument();
  });
});

import { Theme } from '@radix-ui/themes';
import { render, screen } from '@testing-library/react';

import { GridSummaryField } from './grid-summary-field';
import { BYTES_PER_SAMPLE, SAMPLE_BUDGET } from '../../../../../utils/world-dimensions';
import { SIZE_PRESETS } from '../lib/size-presets';

const BUDGET_SIDE = Math.floor(Math.sqrt(SAMPLE_BUDGET));
const BUDGET_MEMORY_MB = Math.round((BUDGET_SIDE * BUDGET_SIDE * BYTES_PER_SAMPLE) / 1_000_000);
const BUDGET_DETAIL = (12_000 / BUDGET_SIDE).toFixed(0);

function renderSummary(sizeMeters: number, metersPerSample: number) {
  render(
    <Theme>
      <GridSummaryField sizeMeters={sizeMeters} metersPerSample={metersPerSample} />
    </Theme>
  );
}

describe('GridSummaryField', () => {
  it('fits every size preset at a coarse detail', () => {
    for (const preset of SIZE_PRESETS) {
      const { unmount } = render(
        <Theme>
          <GridSummaryField sizeMeters={preset.sizeMeters} metersPerSample={4} />
        </Theme>
      );
      expect(screen.queryByText(/sample budget/i)).toBeNull();
      unmount();
    }
  });

  it('shows the derived grid, the memory and the effective detail', () => {
    renderSummary(3000, 1);

    expect(
      screen.getByText('3000 × 3000 samples · 108 MB data · 1 m per sample')
    ).toBeInTheDocument();
    expect(screen.queryByText(/sample budget/i)).toBeNull();
  });

  it('warns when the sample budget clamps the requested detail', () => {
    renderSummary(12_000, 0.5);

    expect(
      screen.getByText(
        `${BUDGET_SIDE} × ${BUDGET_SIDE} samples · ${BUDGET_MEMORY_MB} MB data · ${BUDGET_DETAIL} m per sample`
      )
    ).toBeInTheDocument();
    expect(screen.getByText(/sample budget/i)).toBeInTheDocument();
  });
});

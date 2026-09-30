import { Theme } from '@radix-ui/themes';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { DetailField } from './detail-field';
import { TERRAIN_DETAIL_OPTIONS } from '../lib/terrain-detail';

function renderField(metersPerSample: number, onChange: (value: number) => void = () => {}) {
  render(
    <Theme>
      <DetailField metersPerSample={metersPerSample} onChange={onChange} />
    </Theme>
  );
}

describe('DetailField', () => {
  it('renders every option from the shared list', () => {
    renderField(TERRAIN_DETAIL_OPTIONS[0].metersPerSample);

    for (const option of TERRAIN_DETAIL_OPTIONS) {
      expect(screen.getByRole('radio', { name: option.label })).toBeInTheDocument();
    }
  });

  it('marks only the active option', () => {
    const active = TERRAIN_DETAIL_OPTIONS[1];
    renderField(active.metersPerSample);

    for (const option of TERRAIN_DETAIL_OPTIONS) {
      expect(screen.getByRole('radio', { name: option.label })).toHaveAttribute(
        'aria-checked',
        String(option === active)
      );
    }
  });

  it('reports every selectable option', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    // A value outside the list leaves every option clickable.
    renderField(-1, onChange);

    for (const option of TERRAIN_DETAIL_OPTIONS) {
      await user.click(screen.getByRole('radio', { name: option.label }));
      expect(onChange).toHaveBeenLastCalledWith(option.metersPerSample);
    }
  });
});

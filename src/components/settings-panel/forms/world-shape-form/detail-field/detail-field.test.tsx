import { Theme } from '@radix-ui/themes';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { DetailField } from './detail-field';

describe('DetailField', () => {
  it('marks the active detail option', () => {
    render(
      <Theme>
        <DetailField metersPerSample={2} onChange={() => {}} />
      </Theme>
    );

    expect(screen.getByRole('radio', { name: '2 m' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: '1 m' })).toHaveAttribute('aria-checked', 'false');
  });

  it('reports the selected detail', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <Theme>
        <DetailField metersPerSample={1} onChange={onChange} />
      </Theme>
    );

    await user.click(screen.getByRole('radio', { name: '0.5 m' }));

    expect(onChange).toHaveBeenCalledWith(0.5);
  });
});

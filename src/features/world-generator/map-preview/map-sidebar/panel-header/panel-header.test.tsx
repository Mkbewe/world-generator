import { Theme } from '@radix-ui/themes';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { PanelHeader } from './panel-header';

describe('PanelHeader', () => {
  it('reports the selected position and the collapse request', async () => {
    const user = userEvent.setup();
    const onPositionChange = vi.fn();
    const onCollapsedChange = vi.fn();
    render(
      <Theme>
        <PanelHeader
          collapsed={false}
          position='top'
          onPositionChange={onPositionChange}
          onCollapsedChange={onCollapsedChange}
        />
      </Theme>
    );

    expect(screen.getAllByRole('radio').map(radio => radio.getAttribute('aria-label'))).toEqual([
      'Move panels to top',
      'Move panels to bottom',
    ]);

    await user.click(screen.getByRole('radio', { name: 'Move panels to bottom' }));
    expect(onPositionChange).toHaveBeenCalledWith('bottom');

    await user.click(screen.getByRole('button', { name: 'Hide panels' }));
    expect(onCollapsedChange).toHaveBeenCalledWith(true);
  });

  it('shows only the expand toggle while collapsed', async () => {
    const user = userEvent.setup();
    const onCollapsedChange = vi.fn();
    render(
      <Theme>
        <PanelHeader
          collapsed
          position='top'
          onPositionChange={() => {}}
          onCollapsedChange={onCollapsedChange}
        />
      </Theme>
    );

    expect(screen.queryByText('Panels')).toBeNull();
    expect(screen.queryByRole('radio')).toBeNull();

    await user.click(screen.getByRole('button', { name: 'Show panels' }));
    expect(onCollapsedChange).toHaveBeenCalledWith(false);
  });
});

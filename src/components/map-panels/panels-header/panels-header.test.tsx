import { Theme } from '@radix-ui/themes';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { PanelsHeader } from './panels-header';

describe('PanelsHeader', () => {
  it('reports the selected position and the collapse request', async () => {
    const user = userEvent.setup();
    const onPositionChange = vi.fn();
    const onCollapsedChange = vi.fn();
    render(
      <Theme>
        <PanelsHeader
          collapsed={false}
          position='middle'
          onPositionChange={onPositionChange}
          onCollapsedChange={onCollapsedChange}
        />
      </Theme>
    );

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
        <PanelsHeader
          collapsed
          position='top'
          onPositionChange={() => {}}
          onCollapsedChange={onCollapsedChange}
        />
      </Theme>
    );

    expect(screen.queryByText('Panels')).toBeNull();
    expect(screen.queryByRole('radio', { name: 'Center panels' })).toBeNull();

    await user.click(screen.getByRole('button', { name: 'Show panels' }));
    expect(onCollapsedChange).toHaveBeenCalledWith(false);
  });
});

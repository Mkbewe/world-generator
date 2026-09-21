import { Theme } from '@radix-ui/themes';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { TabLinkToggle } from './tab-link-toggle';
import { useViewSyncStore, VIEW_SYNC_DEFAULTS } from '../../../stores';

function renderToggle() {
  render(
    <Theme>
      <TabLinkToggle />
    </Theme>
  );
}

describe('TabLinkToggle', () => {
  beforeEach(() => {
    useViewSyncStore.setState({ ...VIEW_SYNC_DEFAULTS });
  });

  it('starts unlinked and links the panels on click', async () => {
    const user = userEvent.setup();
    renderToggle();

    const toggle = screen.getByRole('button', { name: 'Link preview to settings' });
    expect(toggle).toHaveAttribute('aria-pressed', 'false');

    await user.click(toggle);

    expect(useViewSyncStore.getState().linked).toBe(true);
    expect(screen.getByRole('button', { name: 'Unlink preview from settings' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
  });
});

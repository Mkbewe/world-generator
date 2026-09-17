import { Theme } from '@radix-ui/themes';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ViewControls } from './view-controls';

function renderControls(overrides: Partial<Parameters<typeof ViewControls>[0]> = {}) {
  const props = {
    zoom: 1,
    onZoomIn: vi.fn(),
    onZoomOut: vi.fn(),
    onReset: vi.fn(),
    ...overrides,
  };
  render(
    <Theme>
      <ViewControls {...props} />
    </Theme>
  );
  return props;
}

describe('ViewControls', () => {
  it('zooms in and out in discrete steps', async () => {
    const user = userEvent.setup();
    const props = renderControls({ zoom: 2 });

    expect(screen.getByText('2.0x')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Zoom in' }));
    await user.click(screen.getByRole('button', { name: 'Zoom out' }));

    expect(props.onZoomIn).toHaveBeenCalledOnce();
    expect(props.onZoomOut).toHaveBeenCalledOnce();
  });

  it('disables the reset and zoom out while fitted', async () => {
    const user = userEvent.setup();
    const props = renderControls({ zoom: 1 });

    expect(screen.getByRole('button', { name: /reset/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Zoom out' })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: 'Zoom in' }));

    expect(props.onZoomIn).toHaveBeenCalledOnce();
  });
});

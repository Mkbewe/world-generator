import { Theme } from '@radix-ui/themes';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ViewControls } from './view-controls';
import { MAX_VIEW_SCALE, MIN_VIEW_SCALE } from '../../../utils/map-renderer';

function renderControls(overrides: Partial<Parameters<typeof ViewControls>[0]> = {}) {
  const props = {
    zoom: 1,
    fitted: false,
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

  it('disables the reset while the fitted view is active', () => {
    renderControls({ zoom: 1, fitted: true });

    expect(screen.getByRole('button', { name: /reset/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Zoom out' })).toBeEnabled();
  });

  it('keeps the reset available when the fitted zoom is panned', () => {
    renderControls({ zoom: 1, fitted: false });

    expect(screen.getByRole('button', { name: /reset/i })).toBeEnabled();
  });

  it('disables zoom out at the minimum scale', () => {
    renderControls({ zoom: MIN_VIEW_SCALE, fitted: false });

    expect(screen.getByRole('button', { name: 'Zoom out' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Zoom in' })).toBeEnabled();
  });

  it('disables zoom in at the maximum scale', () => {
    renderControls({ zoom: MAX_VIEW_SCALE, fitted: false });

    expect(screen.getByRole('button', { name: 'Zoom in' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Zoom out' })).toBeEnabled();
  });
});

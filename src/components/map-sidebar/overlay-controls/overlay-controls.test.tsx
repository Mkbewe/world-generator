import { Theme } from '@radix-ui/themes';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { OverlayControls } from './overlay-controls';
import { emptyRenderState, type MapOverlayOption } from '../../../utils/map-renderer';

function overlay(available: boolean): MapOverlayOption {
  return { id: 'world-boundary', label: 'World boundary', visible: false, available };
}

function renderControls(
  available: boolean,
  onOverlayChange: (id: string, visible: boolean) => void
) {
  return render(
    <Theme>
      <OverlayControls
        preview={{ ...emptyRenderState(), overlays: [overlay(available)] }}
        onOverlayChange={onOverlayChange}
      />
    </Theme>
  );
}

describe('OverlayControls', () => {
  it('reports overlay changes', async () => {
    const user = userEvent.setup();
    const onOverlayChange = vi.fn();
    renderControls(true, onOverlayChange);

    await user.click(screen.getByRole('switch', { name: 'World boundary' }));

    expect(onOverlayChange).toHaveBeenCalledWith('world-boundary', true);
  });

  it('disables unavailable overlays', () => {
    renderControls(false, () => {});

    expect(screen.getByRole('switch', { name: 'World boundary' })).toBeDisabled();
  });
});

import { Theme } from '@radix-ui/themes';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { LayerTabs } from './layer-tabs';
import type { MapLayerNode } from '../../utils/map-renderer';

const TABS: readonly MapLayerNode[] = [
  { id: 'world-shape', label: 'World shape', available: true, selectedLayer: 'world-shape' },
  { id: 'macro-region', label: 'Macro regions', available: false, selectedLayer: 'macro-region' },
  { id: 'noise', label: 'Noise', available: true, selectedLayer: 'noise' },
];

function renderTabs(activeTab = 'world-shape'): ReturnType<typeof vi.fn> {
  const onLayerChange = vi.fn();
  render(
    <Theme>
      <LayerTabs navigation={{ tabs: TABS, activeTab }} onLayerChange={onLayerChange} />
    </Theme>
  );
  return onLayerChange;
}

describe('LayerTabs', () => {
  it('lists the layer tabs and reports the selected one', async () => {
    const user = userEvent.setup();
    const onLayerChange = renderTabs();

    expect(
      within(screen.getByRole('tablist', { name: 'Map layers' }))
        .getAllByRole('tab')
        .map(tab => tab.getAttribute('aria-label'))
    ).toEqual(['World shape', 'Macro regions', 'Noise']);

    await user.click(screen.getByRole('tab', { name: 'Noise' }));

    expect(onLayerChange).toHaveBeenCalledWith('noise');
  });

  it('ignores unavailable tabs', async () => {
    const user = userEvent.setup();
    const onLayerChange = renderTabs();

    expect(screen.getByRole('tab', { name: 'Macro regions' })).toBeDisabled();

    await user.click(screen.getByRole('tab', { name: 'Macro regions' }));

    expect(onLayerChange).not.toHaveBeenCalled();
  });
});

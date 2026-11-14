import { Theme } from '@radix-ui/themes';
import type { MapLayerNode } from '@renderer';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { LayerViews } from './layer-views';

function climateTabs(macroRegionAvailable = true): readonly MapLayerNode[] {
  return [
    {
      id: 'climate',
      labelKey: 'layers.baseClimate',
      available: true,
      selectedChild: 'geology',
      selectedLayer: 'geology',
      children: [
        {
          id: 'macro-region',
          labelKey: 'layers.macroRegions',
          available: macroRegionAvailable,
          selectedLayer: 'macro-region',
        },
        { id: 'geology', labelKey: 'layers.geology', available: true, selectedLayer: 'geology' },
      ],
    },
  ];
}

describe('LayerViews', () => {
  it('reports the view selected in the active group', async () => {
    const user = userEvent.setup();
    const onViewChange = vi.fn();
    render(
      <Theme>
        <LayerViews tabs={climateTabs()} activeTab='climate' onViewChange={onViewChange} />
      </Theme>
    );

    expect(screen.getByRole('radio', { name: 'Geology' })).toBeChecked();

    await user.click(screen.getByRole('radio', { name: 'Macro regions' }));

    expect(onViewChange).toHaveBeenCalledWith('macro-region');
  });

  it('ignores clicks on unavailable views', async () => {
    const user = userEvent.setup();
    const onViewChange = vi.fn();
    render(
      <Theme>
        <LayerViews tabs={climateTabs(false)} activeTab='climate' onViewChange={onViewChange} />
      </Theme>
    );

    await user.click(screen.getByRole('radio', { name: 'Macro regions' }));

    expect(onViewChange).not.toHaveBeenCalled();
  });
});

import { Theme } from '@radix-ui/themes';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { LayerViews } from './layer-views';
import type { MapLayerNode } from '../../../utils/map-renderer';

function climateTabs(macroRegionAvailable = true): readonly MapLayerNode[] {
  return [
    {
      id: 'climate',
      label: 'Climate',
      available: true,
      selectedChild: 'geology',
      selectedLayer: 'geology',
      children: [
        {
          id: 'macro-region',
          label: 'Macro regions',
          available: macroRegionAvailable,
          selectedLayer: 'macro-region',
        },
        { id: 'geology', label: 'Geology', available: true, selectedLayer: 'geology' },
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

import { Theme } from '@radix-ui/themes';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { type RegionTabItem, RegionTabs } from './region-tabs';

const ITEMS: readonly RegionTabItem[] = [
  { id: 'a', label: 'Region 1', color: [46, 125, 50] },
  { id: 'b', label: 'Region 2', color: [124, 179, 66] },
  { id: 'c', label: 'Region 3', color: [253, 216, 53] },
];

function renderTabs(selectedIndex = 0, onSelect = vi.fn()) {
  render(
    <Theme>
      <RegionTabs
        items={ITEMS}
        selectedIndex={selectedIndex}
        onSelect={onSelect}
        ariaLabel='Regions'
      />
    </Theme>
  );
  return onSelect;
}

describe('RegionTabs', () => {
  it('renders one tab per item and marks the selected one', () => {
    renderTabs(1);

    expect(screen.getAllByRole('tab')).toHaveLength(3);
    expect(screen.getByRole('tab', { name: 'Region 2' })).toHaveAttribute('aria-selected', 'true');
  });

  it('paints every tab with its colour', () => {
    renderTabs();

    const first = screen.getByRole('tab', { name: 'Region 1' }).querySelector('span');
    const second = screen.getByRole('tab', { name: 'Region 2' }).querySelector('span');
    expect(first?.getAttribute('style')).toContain('rgb(46, 125, 50)');
    expect(second?.getAttribute('style')).toContain('rgb(124, 179, 66)');
  });

  it('reports the chosen tab', async () => {
    const user = userEvent.setup();
    const onSelect = renderTabs();

    await user.click(screen.getByRole('tab', { name: 'Region 3' }));

    expect(onSelect).toHaveBeenCalledWith(2);
  });
});

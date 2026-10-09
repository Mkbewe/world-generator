import { Theme } from '@radix-ui/themes';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { RegionTabs } from './region-tabs';
import type { GeologicalRegionType } from '../../../../../utils/map-generator';

const MIXED: readonly GeologicalRegionType[] = [
  'ordinary',
  'volcanic',
  'atoll',
  'ordinary',
  'volcanic',
  'atoll',
];

function renderTabs(types: readonly GeologicalRegionType[], selectedIndex = 0, onSelect = vi.fn()) {
  render(
    <Theme>
      <RegionTabs types={types} selectedIndex={selectedIndex} onSelect={onSelect} />
    </Theme>
  );
  return onSelect;
}

describe('RegionTabs', () => {
  it('renders one tab per region and marks the selected one', () => {
    renderTabs(['ordinary', 'volcanic', 'atoll'], 1);

    expect(screen.getAllByRole('tab')).toHaveLength(3);
    expect(screen.getByRole('tab', { name: 'Region 2' })).toHaveAttribute('aria-selected', 'true');
  });

  it('paints every tab with the shade of its type', () => {
    renderTabs(['ordinary', 'volcanic']);

    const ordinary = screen.getByRole('tab', { name: 'Region 1' }).querySelector('span');
    const volcanic = screen.getByRole('tab', { name: 'Region 2' }).querySelector('span');
    expect(ordinary?.getAttribute('style')).toContain('rgb(148, 196, 108)');
    expect(volcanic?.getAttribute('style')).toContain('rgb(150, 96, 70)');
  });

  it('reports the chosen tab', async () => {
    const user = userEvent.setup();
    const onSelect = renderTabs(MIXED);

    await user.click(screen.getByRole('tab', { name: 'Region 4' }));

    expect(onSelect).toHaveBeenCalledWith(3);
  });
});

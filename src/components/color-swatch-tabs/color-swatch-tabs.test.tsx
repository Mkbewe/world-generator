import { Theme } from '@radix-ui/themes';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { type ColorSwatchTabOption, ColorSwatchTabs } from './color-swatch-tabs';

const ITEMS: readonly ColorSwatchTabOption[] = [
  { id: 'a', label: 'Region 1', color: [46, 125, 50] },
  { id: 'b', label: 'Region 2', color: [124, 179, 66] },
  { id: 'c', label: 'Region 3', color: [253, 216, 53] },
];

function renderTabs(selectedId = 'a', onSelect = vi.fn()) {
  render(
    <Theme>
      <ColorSwatchTabs
        items={ITEMS}
        selectedId={selectedId}
        onSelect={onSelect}
        ariaLabel='Regions'
      />
    </Theme>
  );
  return onSelect;
}

describe('ColorSwatchTabs', () => {
  it('renders one button per option inside a labelled group', () => {
    renderTabs('b');

    expect(screen.getByRole('group', { name: 'Regions' })).toBeInTheDocument();
    expect(screen.getAllByRole('button')).toHaveLength(3);
    expect(screen.getByRole('button', { name: 'Region 2' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(screen.getByRole('button', { name: 'Region 1' })).toHaveAttribute(
      'aria-pressed',
      'false'
    );
  });

  it('paints every option with its colour', () => {
    renderTabs();

    const first = screen.getByRole('button', { name: 'Region 1' }).querySelector('span');
    const second = screen.getByRole('button', { name: 'Region 2' }).querySelector('span');
    expect(first?.getAttribute('style')).toContain('rgb(46, 125, 50)');
    expect(second?.getAttribute('style')).toContain('rgb(124, 179, 66)');
  });

  it('reports the chosen option by its stable id', async () => {
    const user = userEvent.setup();
    const onSelect = renderTabs();

    await user.click(screen.getByRole('button', { name: 'Region 3' }));

    expect(onSelect).toHaveBeenCalledWith('c');
  });
});

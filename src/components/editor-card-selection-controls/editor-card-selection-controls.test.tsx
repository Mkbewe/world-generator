import { Theme } from '@radix-ui/themes';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { EditorCardSelectionControls } from './editor-card-selection-controls';

const IDS = ['a', 'b', 'c'];

function renderControls(selectedId: string | undefined, onSelect = vi.fn()) {
  render(
    <Theme>
      <EditorCardSelectionControls ids={IDS} selectedId={selectedId} onSelect={onSelect} />
    </Theme>
  );
  return onSelect;
}

describe('EditorCardSelectionControls', () => {
  it('selects the previous and next item by stable id', async () => {
    const user = userEvent.setup();
    const onSelect = renderControls('b');

    await user.click(screen.getByRole('button', { name: 'Previous' }));
    await user.click(screen.getByRole('button', { name: 'Next' }));

    expect(onSelect).toHaveBeenNthCalledWith(1, 'a');
    expect(onSelect).toHaveBeenNthCalledWith(2, 'c');
  });

  it('disables the control at the list boundaries', () => {
    renderControls('a');
    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Next' })).toBeEnabled();
  });

  it('disables the next control on the last item', () => {
    renderControls('c');
    expect(screen.getByRole('button', { name: 'Previous' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
  });

  it('disables both controls when the selection is unknown', () => {
    renderControls('missing');
    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
  });
});

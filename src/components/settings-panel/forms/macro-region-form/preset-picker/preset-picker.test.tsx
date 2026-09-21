import { Theme } from '@radix-ui/themes';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { PresetPicker } from './preset-picker';
import { MACRO_REGION_FORM_DEFAULTS, useMacroRegionFormStore } from '../../../../../stores';
import {
  baseRegions,
  overlayRegions,
} from '../../../../../utils/map-generator/stages/macro-region-sizes';

function renderPicker() {
  render(
    <Theme>
      <PresetPicker />
    </Theme>
  );
}

describe('PresetPicker', () => {
  beforeEach(() => {
    useMacroRegionFormStore.setState({ ...MACRO_REGION_FORM_DEFAULTS });
  });

  it('applies a preset and marks it active', async () => {
    const user = userEvent.setup();
    renderPicker();

    expect(screen.getByRole('button', { name: 'Rings' })).toHaveAttribute('aria-pressed', 'true');

    await user.click(screen.getByRole('button', { name: 'Rings + poles' }));

    const state = useMacroRegionFormStore.getState();
    expect(baseRegions(state.regions)).toHaveLength(4);
    expect(overlayRegions(state.regions)).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'Rings + poles' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(screen.getByRole('button', { name: 'Rings' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('clears the active preset after a manual change', async () => {
    const user = userEvent.setup();
    renderPicker();

    await user.click(screen.getByRole('button', { name: 'Horizontal' }));
    expect(screen.getByRole('button', { name: 'Horizontal' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );

    const region = useMacroRegionFormStore.getState().regions[0];
    act(() => {
      useMacroRegionFormStore.getState().updateRegion(region.id, { label: 'Changed' });
    });

    expect(screen.getByRole('button', { name: 'Horizontal' })).toHaveAttribute(
      'aria-pressed',
      'false'
    );
    expect(screen.getByText(/edited manually/i)).toBeInTheDocument();
  });
});

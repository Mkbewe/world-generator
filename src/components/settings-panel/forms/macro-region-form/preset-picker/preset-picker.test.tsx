import { Theme } from '@radix-ui/themes';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { PresetPicker } from './preset-picker';
import { MACRO_REGION_FORM_DEFAULTS, useMacroRegionFormStore } from '../../../../../stores';
import { macroRegionPreset } from '../../../../../utils/map-generator/stages/macro-region-presets';
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

  it('starts on the rings preset and applies another one', async () => {
    const user = userEvent.setup();
    renderPicker();

    expect(screen.getByRole('radio', { name: 'Rings' })).toHaveAttribute('aria-checked', 'true');

    await user.click(screen.getByRole('radio', { name: 'Rings + poles' }));

    const state = useMacroRegionFormStore.getState();
    expect(state.activePreset).toBe('rings-with-poles');
    expect(baseRegions(state.regions)).toHaveLength(4);
    expect(overlayRegions(state.regions)).toHaveLength(2);
    expect(screen.getByRole('radio', { name: 'Rings + poles' })).toHaveAttribute(
      'aria-checked',
      'true'
    );
    expect(screen.getByRole('radio', { name: 'Rings' })).toHaveAttribute('aria-checked', 'false');
  });

  it('clears the active preset after a manual change', async () => {
    const user = userEvent.setup();
    renderPicker();

    await user.click(screen.getByRole('radio', { name: 'Horizontal' }));
    expect(screen.getByRole('radio', { name: 'Horizontal' })).toHaveAttribute(
      'aria-checked',
      'true'
    );

    const region = useMacroRegionFormStore.getState().regions[0];
    act(() => {
      useMacroRegionFormStore.getState().updateRegion(region.id, { label: 'Changed' });
    });

    expect(useMacroRegionFormStore.getState().activePreset).toBeUndefined();
    expect(screen.getByRole('radio', { name: 'Horizontal' })).toHaveAttribute(
      'aria-checked',
      'false'
    );
    expect(screen.getByText(/edited manually/i)).toBeInTheDocument();
  });

  it('does not re-select a preset when edited values match it again', () => {
    renderPicker();

    const region = useMacroRegionFormStore.getState().regions[0];
    act(() => {
      useMacroRegionFormStore.getState().updateRegion(region.id, { label: 'Edited' });
    });
    act(() => {
      useMacroRegionFormStore.setState({ regions: macroRegionPreset('rings').createRegions() });
    });

    expect(useMacroRegionFormStore.getState().activePreset).toBeUndefined();
    expect(screen.getByRole('radio', { name: 'Rings' })).toHaveAttribute('aria-checked', 'false');
  });
});

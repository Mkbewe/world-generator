import { Theme } from '@radix-ui/themes';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { PresetPicker } from './preset-picker';
import { BASE_CLIMATE_FORM_DEFAULTS, useBaseClimateFormStore } from '../../../../../stores';

function renderPicker() {
  render(
    <Theme>
      <PresetPicker />
    </Theme>
  );
}

describe('PresetPicker', () => {
  beforeEach(() => {
    useBaseClimateFormStore.setState({ ...BASE_CLIMATE_FORM_DEFAULTS });
  });

  it('starts on ring and applies another preset', async () => {
    const user = userEvent.setup();
    renderPicker();

    expect(screen.getByRole('radio', { name: 'Ring' })).toHaveAttribute('aria-checked', 'true');

    await user.click(screen.getByRole('radio', { name: 'Horizontal' }));

    const state = useBaseClimateFormStore.getState();
    expect(state.activePreset).toBe('horizontal');
    expect(state.layout).toBe('horizontal');
    expect(state.zones).toHaveLength(5);
    expect(screen.getByRole('radio', { name: 'Horizontal' })).toHaveAttribute(
      'aria-checked',
      'true'
    );
    expect(screen.getByRole('radio', { name: 'Ring' })).toHaveAttribute('aria-checked', 'false');
  });

  it('clears the active preset after a manual change', async () => {
    const user = userEvent.setup();
    renderPicker();

    const zone = useBaseClimateFormStore.getState().zones[0];
    if (!zone) {
      throw new Error('Expected a zone.');
    }
    act(() => {
      useBaseClimateFormStore.getState().updateZone(zone.id, { label: 'Changed' });
    });

    expect(useBaseClimateFormStore.getState().activePreset).toBeUndefined();
    expect(screen.getByRole('radio', { name: 'Ring' })).toHaveAttribute('aria-checked', 'false');
    expect(screen.getByText(/edited manually/i)).toBeInTheDocument();
    await user.click(screen.getByRole('radio', { name: 'Vertical' }));
    expect(useBaseClimateFormStore.getState().activePreset).toBe('vertical');
  });
});

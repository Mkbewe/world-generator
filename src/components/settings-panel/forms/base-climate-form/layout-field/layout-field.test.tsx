import { Theme } from '@radix-ui/themes';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { LayoutField } from './layout-field';
import { BASE_CLIMATE_FORM_DEFAULTS, useBaseClimateFormStore } from '../../../../../stores';

function renderField() {
  render(
    <Theme>
      <LayoutField />
    </Theme>
  );
}

describe('LayoutField', () => {
  beforeEach(() => {
    useBaseClimateFormStore.setState({ ...BASE_CLIMATE_FORM_DEFAULTS });
  });

  it('switches the layout family and clears the preset', async () => {
    const user = userEvent.setup();
    renderField();

    expect(screen.getByRole('radio', { name: 'Horizontal' })).toHaveAttribute(
      'aria-checked',
      'true'
    );

    await user.click(screen.getByRole('radio', { name: 'Ring' }));

    expect(useBaseClimateFormStore.getState().layout).toBe('rings');
    expect(useBaseClimateFormStore.getState().activePreset).toBeUndefined();
    expect(screen.getByRole('radio', { name: 'Ring' })).toHaveAttribute('aria-checked', 'true');

    await user.click(screen.getByRole('radio', { name: 'Vertical' }));

    const zones = useBaseClimateFormStore.getState().zones;
    expect(useBaseClimateFormStore.getState().layout).toBe('vertical');
    expect(zones.every(zone => zone.geometry.kind === 'band' && zone.geometry.axis === 'x')).toBe(
      true
    );
  });
});

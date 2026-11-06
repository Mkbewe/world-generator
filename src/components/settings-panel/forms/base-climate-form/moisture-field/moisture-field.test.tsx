import { Theme } from '@radix-ui/themes';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { MoistureField } from './moisture-field';
import { BASE_CLIMATE_FORM_DEFAULTS, useBaseClimateFormStore } from '../../../../../stores';

function renderField() {
  render(
    <Theme>
      <MoistureField />
    </Theme>
  );
}

describe('MoistureField', () => {
  beforeEach(() => {
    useBaseClimateFormStore.setState({ ...BASE_CLIMATE_FORM_DEFAULTS });
  });

  it('shifts the world moisture without clearing the preset', async () => {
    const user = userEvent.setup();
    renderField();

    expect(screen.getByText('Balanced · 50%')).toBeInTheDocument();

    const slider = within(screen.getByLabelText('World moisture')).getByRole('slider');
    slider.focus();
    await user.keyboard('{ArrowRight}');

    expect(useBaseClimateFormStore.getState().moisture).toBeGreaterThan(
      BASE_CLIMATE_FORM_DEFAULTS.moisture
    );
    expect(useBaseClimateFormStore.getState().activePreset).toBe('horizontal');
  });
});

import { Theme } from '@radix-ui/themes';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { IrregularityField } from './irregularity-field';
import { BASE_CLIMATE_FORM_DEFAULTS, useBaseClimateFormStore } from '../../../../../../stores';

function renderField() {
  render(
    <Theme>
      <IrregularityField />
    </Theme>
  );
}

describe('IrregularityField', () => {
  beforeEach(() => {
    useBaseClimateFormStore.setState({ ...BASE_CLIMATE_FORM_DEFAULTS });
  });

  it('edits the border irregularity without clearing the preset', async () => {
    const user = userEvent.setup();
    renderField();

    const slider = within(screen.getByLabelText('Irregularity')).getByRole('slider');
    slider.focus();
    await user.keyboard('{ArrowRight}');

    expect(useBaseClimateFormStore.getState().irregularity).toBeGreaterThan(
      BASE_CLIMATE_FORM_DEFAULTS.irregularity
    );
    expect(useBaseClimateFormStore.getState().activePreset).toBe('ring');
  });
});

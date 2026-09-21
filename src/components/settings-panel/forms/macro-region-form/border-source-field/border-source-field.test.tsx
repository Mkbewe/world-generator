import { Theme } from '@radix-ui/themes';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { BorderSourceField } from './border-source-field';
import { MACRO_REGION_FORM_DEFAULTS, useMacroRegionFormStore } from '../../../../../stores';

function renderField() {
  render(
    <Theme>
      <BorderSourceField />
    </Theme>
  );
}

describe('BorderSourceField', () => {
  beforeEach(() => {
    useMacroRegionFormStore.setState({ ...MACRO_REGION_FORM_DEFAULTS });
  });

  it('switches the border noise source and keeps the amplitude', async () => {
    const user = userEvent.setup();
    renderField();

    expect(screen.getByRole('radio', { name: 'Dedicated' })).toHaveAttribute(
      'aria-checked',
      'true'
    );
    expect(screen.getByText(/own deterministic noise/)).toBeInTheDocument();

    await user.click(screen.getByRole('radio', { name: 'Noise layer' }));

    const state = useMacroRegionFormStore.getState();
    expect(state.deformation.source).toBe('noise-map');
    expect(state.deformation.amplitude).toBe(MACRO_REGION_FORM_DEFAULTS.deformation.amplitude);
    expect(screen.getByRole('radio', { name: 'Noise layer' })).toHaveAttribute(
      'aria-checked',
      'true'
    );
    expect(screen.getByText(/follow the Noise settings/)).toBeInTheDocument();
  });
});

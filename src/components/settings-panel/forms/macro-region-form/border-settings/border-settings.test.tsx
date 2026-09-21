import { Theme } from '@radix-ui/themes';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { BorderSettings } from './border-settings';
import { MACRO_REGION_FORM_DEFAULTS, useMacroRegionFormStore } from '../../../../../stores';

describe('BorderSettings', () => {
  beforeEach(() => {
    useMacroRegionFormStore.setState({ ...MACRO_REGION_FORM_DEFAULTS });
  });

  it('shows the shared irregularity and commits keyboard changes', async () => {
    const user = userEvent.setup();
    render(
      <Theme>
        <BorderSettings />
      </Theme>
    );

    expect(screen.getByText('Small')).toBeInTheDocument();
    expect(screen.getByText('None')).toBeInTheDocument();
    expect(screen.getByText('Large')).toBeInTheDocument();

    const slider = within(screen.getByLabelText('Irregularity')).getByRole('slider');
    slider.focus();
    await user.keyboard('{ArrowRight}');

    expect(useMacroRegionFormStore.getState().deformation.amplitude).toBeCloseTo(0.09);
  });
});

import { Theme } from '@radix-ui/themes';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { LandmassForm } from './landmass-form';
import { LANDMASS_FORM_DEFAULTS, useLandmassFormStore } from '../../../../stores';
import { MAX_LANDMASSES } from '../../../../utils/map-generator/stages/landmass-defaults';

function renderForm() {
  render(
    <Theme>
      <LandmassForm />
    </Theme>
  );
}

describe('LandmassForm', () => {
  beforeEach(() => {
    useLandmassFormStore.setState({ ...LANDMASS_FORM_DEFAULTS });
  });

  it('shows only what this stage drives: count, size and the shape pool', () => {
    renderForm();

    expect(screen.getByLabelText('Structures')).toBeInTheDocument();
    expect(screen.getByLabelText('Size')).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Round' })).toBeChecked();
    // The shelf and coastline roughness belong to the stages that consume them.
    expect(screen.queryByLabelText('Shelf width')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Coastline roughness')).not.toBeInTheDocument();
  });

  it('commits slider changes to the form store', async () => {
    const user = userEvent.setup();
    renderForm();

    const slider = within(screen.getByLabelText('Structures')).getByRole('slider');
    expect(slider).toHaveAttribute('aria-valuenow', '5');
    expect(slider).toHaveAttribute('aria-valuemax', String(MAX_LANDMASSES));

    slider.focus();
    await user.keyboard('{ArrowRight}');

    expect(useLandmassFormStore.getState().landmasses.count).toBe(6);
  });
});

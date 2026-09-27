import { Theme } from '@radix-ui/themes';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { HeightmapForm } from './heightmap-form';
import {
  HEIGHTMAP_FORM_DEFAULTS,
  LANDMASS_FORM_DEFAULTS,
  useHeightmapFormStore,
  useLandmassFormStore,
} from '../../../../stores';
import {
  DEFAULT_HEIGHTMAP_CONFIG,
  MAX_RELIEF,
} from '../../../../utils/map-generator/stages/heightmap';
import { DEFAULT_LANDMASS_CONFIG } from '../../../../utils/map-generator/stages/landmass';

function renderForm() {
  render(
    <Theme>
      <HeightmapForm />
    </Theme>
  );
}

describe('HeightmapForm', () => {
  beforeEach(() => {
    useHeightmapFormStore.setState({ ...HEIGHTMAP_FORM_DEFAULTS });
    useLandmassFormStore.setState({ ...LANDMASS_FORM_DEFAULTS });
  });

  it('shows the heightmap sliders and the shelf controls', () => {
    renderForm();

    expect(screen.getByLabelText('Relief')).toBeInTheDocument();
    expect(screen.getByLabelText('Feature scale')).toBeInTheDocument();
    expect(screen.getByLabelText('Shelf width')).toBeInTheDocument();
    expect(screen.getByLabelText('Shelf depth')).toBeInTheDocument();
  });

  it('commits relief changes to the heightmap store', async () => {
    const user = userEvent.setup();
    renderForm();

    const slider = within(screen.getByLabelText('Relief')).getByRole('slider');
    expect(slider).toHaveAttribute('aria-valuenow', String(DEFAULT_HEIGHTMAP_CONFIG.relief));
    expect(slider).toHaveAttribute('aria-valuemax', String(MAX_RELIEF));

    slider.focus();
    await user.keyboard('{ArrowRight}');

    expect(useHeightmapFormStore.getState().heightmap.relief).toBeCloseTo(
      DEFAULT_HEIGHTMAP_CONFIG.relief + 0.05,
      10
    );
  });

  it('writes the shelf controls to the landmass config', async () => {
    const user = userEvent.setup();
    renderForm();

    const slider = within(screen.getByLabelText('Shelf depth')).getByRole('slider');
    expect(slider).toHaveAttribute(
      'aria-valuenow',
      String(DEFAULT_LANDMASS_CONFIG.shelf.targetDepth)
    );

    slider.focus();
    await user.keyboard('{ArrowRight}');

    expect(useLandmassFormStore.getState().landmasses.shelf.targetDepth).toBe(
      DEFAULT_LANDMASS_CONFIG.shelf.targetDepth + 5
    );
  });
});

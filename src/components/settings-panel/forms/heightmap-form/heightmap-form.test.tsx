import { Theme } from '@radix-ui/themes';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { HeightmapForm } from './heightmap-form';
import { HEIGHTMAP_FORM_DEFAULTS, useHeightmapFormStore } from '../../../../stores';
import {
  DEFAULT_HEIGHTMAP_CONFIG,
  MAX_RELIEF,
} from '../../../../utils/map-generator/stages/heightmap';

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
  });

  it('shows only the relief slider; form sizes live in the geology areas', () => {
    renderForm();

    expect(screen.getByLabelText('Relief')).toBeInTheDocument();
    expect(screen.queryByLabelText('Feature scale')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Shelf width')).not.toBeInTheDocument();
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
});

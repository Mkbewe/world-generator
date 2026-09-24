import { Theme } from '@radix-ui/themes';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { OverlayRegionCard } from './overlay-region-card';
import { MACRO_REGION_FORM_DEFAULTS, useMacroRegionFormStore } from '../../../../../../stores';
import { createBandOverlay } from '../../../../../../utils/map-generator/stages/macro-region/editor/presets';

describe('OverlayRegionCard', () => {
  beforeEach(() => {
    useMacroRegionFormStore.setState({ ...MACRO_REGION_FORM_DEFAULTS });
  });

  it('shows the band controls and switches the direction', async () => {
    const user = userEvent.setup();
    const band = createBandOverlay('band-1', 'Poles', 'y', 0.5, 0.2, 1);
    useMacroRegionFormStore.setState(state => ({ regions: [...state.regions, band] }));
    render(
      <Theme>
        <OverlayRegionCard region={band} index={0} />
      </Theme>
    );

    expect(screen.getByRole('radio', { name: 'Horizontal' })).toHaveAttribute(
      'aria-checked',
      'true'
    );
    expect(within(screen.getByLabelText('Position')).getByRole('slider')).toBeInTheDocument();
    expect(within(screen.getByLabelText('Width')).getByRole('slider')).toBeInTheDocument();
    expect(
      within(screen.getByLabelText('Overlay irregularity')).getByRole('slider')
    ).toHaveAttribute('aria-valuemax', '0.2');
    expect(within(screen.getByLabelText('Danger')).getByRole('slider')).toBeInTheDocument();

    await user.click(screen.getByRole('radio', { name: 'Vertical' }));

    const updated = useMacroRegionFormStore
      .getState()
      .regions.find(region => region.id === 'band-1');
    expect(updated?.geometry).toMatchObject({ axis: 'x' });
  });

  it('renders nothing for a non-band geometry', () => {
    const region = useMacroRegionFormStore.getState().regions[0];
    render(
      <Theme>
        <OverlayRegionCard region={region} index={0} />
      </Theme>
    );

    expect(screen.queryByLabelText('Region label')).toBeNull();
  });
});

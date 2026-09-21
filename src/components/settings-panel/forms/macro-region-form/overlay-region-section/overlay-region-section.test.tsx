import { Theme } from '@radix-ui/themes';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { OverlayRegionSection } from './overlay-region-section';
import { MACRO_REGION_FORM_DEFAULTS, useMacroRegionFormStore } from '../../../../../stores';
import { overlayRegions } from '../../../../../utils/map-generator/stages/macro-region-sizes';

function renderSection() {
  render(
    <Theme>
      <OverlayRegionSection />
    </Theme>
  );
}

describe('OverlayRegionSection', () => {
  beforeEach(() => {
    useMacroRegionFormStore.setState({ ...MACRO_REGION_FORM_DEFAULTS });
  });

  it('adds horizontal and vertical bands as overlay regions', async () => {
    const user = userEvent.setup();
    renderSection();

    await user.click(screen.getByRole('button', { name: 'Add horizontal overlay' }));
    await user.click(screen.getByRole('button', { name: 'Add vertical overlay' }));

    const overlays = overlayRegions(useMacroRegionFormStore.getState().regions);
    expect(overlays).toHaveLength(2);
    expect(overlays.map(region => region.geometry)).toMatchObject([
      { kind: 'band', axis: 'y', center: 0.5, width: 0.16 },
      { kind: 'band', axis: 'x', center: 0.5, width: 0.16 },
    ]);
    expect(screen.getByText('Overlay regions (2)')).toBeInTheDocument();
    expect(screen.getAllByText('Position')).toHaveLength(2);
    expect(screen.getAllByText('Overlay irregularity')).toHaveLength(2);
    expect(screen.getByText('North')).toBeInTheDocument();
    expect(screen.getByText('South')).toBeInTheDocument();
    expect(screen.getByText('West')).toBeInTheDocument();
    expect(screen.getByText('East')).toBeInTheDocument();
  });

  it('stops adding overlays at the limit', () => {
    while (useMacroRegionFormStore.getState().regions.length < 10) {
      useMacroRegionFormStore.getState().addBaseRegion();
    }
    renderSection();

    expect(screen.getByRole('button', { name: 'Add horizontal overlay' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Add vertical overlay' })).toBeDisabled();
  });
});

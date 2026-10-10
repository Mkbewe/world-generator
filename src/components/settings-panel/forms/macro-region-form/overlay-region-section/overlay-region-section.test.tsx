import { Theme } from '@radix-ui/themes';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { OverlayRegionSection } from './overlay-region-section';
import { MACRO_REGION_FORM_DEFAULTS, useMacroRegionFormStore } from '../../../../../stores';
import { overlayRegions } from '../../../../../utils/map-generator/stages/macro-region/editor/boundary-model';

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

  it('shows the overlay add actions without tabs or a band editor', () => {
    renderSection();

    expect(screen.getByText('Overlay regions (0)')).toBeInTheDocument();
    expect(screen.queryByRole('tab')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Region label')).not.toBeInTheDocument();
  });

  it('adds horizontal and vertical bands and edits the chosen overlay', async () => {
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
    expect(screen.getAllByRole('tab')).toHaveLength(2);

    await user.click(screen.getByRole('tab', { name: 'Region 6' }));

    expect(screen.getByText('Direction')).toBeInTheDocument();
    expect(screen.getByText('Position')).toBeInTheDocument();
    expect(screen.getByText('West')).toBeInTheDocument();
    expect(screen.getByText('East')).toBeInTheDocument();
    expect(screen.getByText('Overlay irregularity')).toBeInTheDocument();
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

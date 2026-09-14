import { Theme } from '@radix-ui/themes';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { MacroRegionForm } from './macro-region-form';
import { MACRO_REGION_FORM_DEFAULTS, useMacroRegionFormStore } from '../../../../stores';
import {
  baseRegions,
  overlayRegions,
  regionSegments,
} from '../../../../utils/map-generator/stages/macro-region-sizes';

function renderForm() {
  render(
    <Theme>
      <MacroRegionForm />
    </Theme>
  );
}

describe('MacroRegionForm', () => {
  beforeEach(() => {
    useMacroRegionFormStore.setState({ ...MACRO_REGION_FORM_DEFAULTS });
  });

  it('shows one shared distribution editor and simple per-region metadata', () => {
    renderForm();

    expect(screen.getByText('Base regions (4)')).toBeInTheDocument();
    expect(screen.getByLabelText('Region width distribution')).toBeInTheDocument();
    expect(within(screen.getByLabelText('Region boundaries')).getAllByRole('slider')).toHaveLength(
      3
    );
    expect(screen.getAllByText('Width')).toHaveLength(4);
    expect(screen.queryByText('Radius')).toBeNull();
    expect(screen.queryByText('Falloff')).toBeNull();
    expect(screen.getByText('Small')).toBeInTheDocument();
    expect(screen.getByText('None')).toBeInTheDocument();
    expect(screen.getByText('Large')).toBeInTheDocument();
  });

  it('shows the Borders section above the base regions', () => {
    renderForm();

    const borders = screen.getByText('Borders');
    const baseHeading = screen.getByText('Base regions (4)');
    expect(
      borders.compareDocumentPosition(baseHeading) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });

  it('resizes regions by dragging a boundary on the distribution bar', async () => {
    const user = userEvent.setup();
    renderForm();

    const [firstHandle] = within(screen.getByLabelText('Region boundaries')).getAllByRole('slider');
    firstHandle.focus();
    await user.keyboard('{ArrowRight}');

    const segments = regionSegments('radial', useMacroRegionFormStore.getState().regions);
    expect(segments[0].percent).toBe(26);
    expect(segments[1].percent).toBe(24);
  });

  it('switches the base layout without changing region metadata', async () => {
    const user = userEvent.setup();
    const first = useMacroRegionFormStore.getState().regions[0];
    useMacroRegionFormStore.getState().updateRegion(first.id, { label: 'Safe haven' });
    renderForm();

    await user.click(screen.getByRole('radio', { name: 'Vertical' }));

    const state = useMacroRegionFormStore.getState();
    expect(state.layout).toBe('vertical');
    expect(baseRegions(state.regions)[0].label).toBe('Safe haven');
    expect(
      baseRegions(state.regions).every(
        region => region.geometry.kind === 'band' && region.geometry.axis === 'x'
      )
    ).toBe(true);
  });

  it('applies ready-made layouts from the preset section at the top', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByRole('button', { name: 'Rings + poles' }));

    let state = useMacroRegionFormStore.getState();
    expect(baseRegions(state.regions)).toHaveLength(4);
    expect(overlayRegions(state.regions)).toHaveLength(2);
    expect(screen.getByText('Overlay regions (2)')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Horizontal' }));
    state = useMacroRegionFormStore.getState();
    expect(state.layout).toBe('horizontal');
    expect(baseRegions(state.regions)).toHaveLength(5);
    expect(overlayRegions(state.regions)).toHaveLength(0);
  });

  it('adds horizontal and vertical bands as overlay regions', async () => {
    const user = userEvent.setup();
    renderForm();

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

  it('disables every add action at the ten-region limit', () => {
    while (useMacroRegionFormStore.getState().regions.length < 10) {
      useMacroRegionFormStore.getState().addBaseRegion();
    }
    renderForm();

    expect(screen.getByRole('button', { name: /Add region/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Add horizontal overlay' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Add vertical overlay' })).toBeDisabled();
  });
});

import { MAX_HEAT_ZONES } from '@generator/stages/base-climate/defaults';
import { Theme } from '@radix-ui/themes';
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { HeatZoneSection } from './heat-zone-section';
import { BASE_CLIMATE_FORM_DEFAULTS, useBaseClimateFormStore } from '../../../../../stores';
import { zoneShares } from '../../../../../stores/form/base-climate-form/lib/zone-model';

function renderSection() {
  render(
    <Theme>
      <HeatZoneSection />
    </Theme>
  );
}

describe('HeatZoneSection', () => {
  beforeEach(() => {
    useBaseClimateFormStore.setState({ ...BASE_CLIMATE_FORM_DEFAULTS });
    useBaseClimateFormStore.getState().applyPreset('horizontal');
  });

  it('shows the zones, the share bar and the selected zone', () => {
    renderSection();

    expect(screen.getByText('Heat zones (5)')).toBeInTheDocument();
    expect(
      within(screen.getByLabelText('Heat zone boundaries')).getAllByRole('slider')
    ).toHaveLength(4);
    expect(screen.getByText('Band width')).toBeInTheDocument();
    expect(
      within(screen.getByRole('group', { name: 'Heat zones' })).getAllByRole('button')
    ).toHaveLength(5);
    expect(screen.getByRole('button', { name: 'Polar north' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(screen.getByLabelText('Zone label')).toHaveValue('Polar north');
    expect(screen.getByText('Width 20% · centre 10%')).toBeInTheDocument();
  });

  it('edits the zone chosen on the tabs', async () => {
    const user = userEvent.setup();
    renderSection();

    await user.click(screen.getByRole('button', { name: 'Equatorial' }));

    const label = screen.getByLabelText('Zone label');
    await user.clear(label);
    await user.type(label, 'Tropics');

    expect(useBaseClimateFormStore.getState().zones[2]?.label).toBe('Tropics');
  });

  it('resizes zones with the keyboard on a boundary handle', async () => {
    const user = userEvent.setup();
    renderSection();

    const [firstHandle] = within(screen.getByLabelText('Heat zone boundaries')).getAllByRole(
      'slider'
    );
    firstHandle?.focus();
    await user.keyboard('{ArrowRight}');

    const state = useBaseClimateFormStore.getState();
    expect(zoneShares(state.zones, state.layout, state.ringExtent)[0]).toBeCloseTo(21);
  });

  it('changes the thermal class of the selected zone', async () => {
    const user = userEvent.setup();
    renderSection();

    await user.click(screen.getByRole('radio', { name: 'Warm' }));

    expect(useBaseClimateFormStore.getState().zones[0]?.thermal).toBe('warm');
  });

  it('adds a zone and stops at the limit', async () => {
    const user = userEvent.setup();
    renderSection();

    await user.click(screen.getByRole('button', { name: /Add zone/ }));
    expect(screen.getByText('Heat zones (6)')).toBeInTheDocument();

    act(() => {
      while (useBaseClimateFormStore.getState().zones.length < MAX_HEAT_ZONES) {
        useBaseClimateFormStore.getState().addZone();
      }
    });

    expect(screen.getByRole('button', { name: /Add zone/ })).toBeDisabled();
  });

  it('removes the selected zone', async () => {
    const user = userEvent.setup();
    renderSection();

    await user.click(screen.getByRole('button', { name: 'Remove Polar north' }));

    expect(useBaseClimateFormStore.getState().zones).toHaveLength(4);
    expect(screen.getByText('Heat zones (4)')).toBeInTheDocument();
  });

  it('moves the selection with the card controls without reordering zones', async () => {
    const user = userEvent.setup();
    renderSection();
    const labelsBefore = useBaseClimateFormStore.getState().zones.map(zone => zone.label);

    expect(screen.getByLabelText('Zone label')).toHaveValue('Polar north');

    await user.click(screen.getByRole('button', { name: 'Next' }));

    expect(screen.getByLabelText('Zone label')).toHaveValue(labelsBefore[1]);
    expect(useBaseClimateFormStore.getState().zones.map(zone => zone.label)).toEqual(labelsBefore);
  });
});

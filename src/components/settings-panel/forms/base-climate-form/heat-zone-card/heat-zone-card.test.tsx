import { Theme } from '@radix-ui/themes';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { HeatZoneCard } from './heat-zone-card';
import { BASE_CLIMATE_FORM_DEFAULTS, useBaseClimateFormStore } from '../../../../../stores';

function CardHarness() {
  const zone = useBaseClimateFormStore(state => state.zones[0]);
  if (!zone) {
    return null;
  }
  return <HeatZoneCard zone={zone} canRemove canMoveEarlier={false} canMoveLater />;
}

function renderCard() {
  render(
    <Theme>
      <CardHarness />
    </Theme>
  );
}

describe('HeatZoneCard', () => {
  beforeEach(() => {
    useBaseClimateFormStore.setState({ ...BASE_CLIMATE_FORM_DEFAULTS });
    useBaseClimateFormStore.getState().applyPreset('horizontal');
  });

  it('edits the label and thermal class', async () => {
    const user = userEvent.setup();
    renderCard();

    expect(screen.getByRole('radio', { name: 'Cold' })).toHaveAttribute('aria-checked', 'true');

    const label = screen.getByLabelText('Zone label');
    await user.clear(label);
    await user.type(label, 'Arctic');

    await user.click(screen.getByRole('radio', { name: 'Warm' }));

    expect(useBaseClimateFormStore.getState().zones[0]).toMatchObject({
      label: 'Arctic',
      thermal: 'warm',
    });
  });

  it('moves and removes the zone', async () => {
    const user = userEvent.setup();
    renderCard();

    expect(screen.getByRole('button', { name: 'Move earlier' })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: 'Move later' }));
    expect(useBaseClimateFormStore.getState().zones[0]?.label).toBe('Temperate north');

    await user.click(screen.getByRole('button', { name: 'Remove Temperate north' }));
    expect(useBaseClimateFormStore.getState().zones).toHaveLength(4);
  });
});

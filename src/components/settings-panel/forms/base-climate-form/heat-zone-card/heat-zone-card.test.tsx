import { Theme } from '@radix-ui/themes';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { HeatZoneCard } from './heat-zone-card';
import { BASE_CLIMATE_FORM_DEFAULTS, useBaseClimateFormStore } from '../../../../../stores';
import type { EditorCardSelectionControlsProps } from '../../../../editor-card-selection-controls';

const SELECTION: EditorCardSelectionControlsProps = {
  ids: ['zone-1', 'zone-2'],
  selectedId: 'zone-1',
  onSelect: () => {},
};

function CardHarness() {
  const zone = useBaseClimateFormStore(state => state.zones[0]);
  if (!zone) {
    return null;
  }
  return <HeatZoneCard zone={zone} selection={SELECTION} canRemove />;
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

  it('removes the zone and no longer exposes the reorder controls', async () => {
    const user = userEvent.setup();
    renderCard();

    expect(screen.queryByRole('button', { name: 'Move earlier' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Move later' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Remove Polar north' }));
    expect(useBaseClimateFormStore.getState().zones).toHaveLength(4);
  });
});

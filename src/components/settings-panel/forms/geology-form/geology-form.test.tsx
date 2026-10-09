import { Theme } from '@radix-ui/themes';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';

import { GeologyForm } from './geology-form';
import {
  GEOLOGY_FORM_DEFAULTS,
  useGeologyFormStore,
  useViewSyncStore,
  VIEW_SYNC_DEFAULTS,
} from '../../../../stores';
import { geologyRegionColor } from '../../../../utils/map-layers';

function renderForm() {
  return render(
    <Theme>
      <GeologyForm />
    </Theme>
  );
}

describe('GeologyForm', () => {
  beforeEach(() => {
    useGeologyFormStore.setState({ ...GEOLOGY_FORM_DEFAULTS });
    useViewSyncStore.setState({ ...VIEW_SYNC_DEFAULTS });
  });

  it('shows the shared layout controls and the active region editor', () => {
    renderForm();

    expect(screen.getByLabelText('Regions')).toBeInTheDocument();
    expect(screen.getByLabelText('Evenness')).toBeInTheDocument();
    expect(screen.getByLabelText('Border irregularity')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Region 1' })).toBeInTheDocument();
    expect(screen.getByLabelText('Geology region areas')).toBeInTheDocument();
    expect(screen.queryByText('Add area')).not.toBeInTheDocument();
  });

  it('applies a preset to the form state', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByRole('button', { name: 'Mosaic' }));

    expect(useGeologyFormStore.getState().regionCount).toBe(9);
    expect(screen.getByRole('tab', { name: 'Region 9' })).toBeInTheDocument();
  });

  it('uses map colours and identifies each region on the area bar', () => {
    renderForm();

    const volcanic = screen.getByTitle('Region 2: Volcanic (18%)');
    const [red, green, blue] = geologyRegionColor('volcanic', 1);
    expect(volcanic).toHaveStyle({ backgroundColor: `rgb(${red}, ${green}, ${blue})` });
  });

  it('edits only the active region', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByRole('tab', { name: 'Region 2' }));
    await user.click(screen.getAllByText('Volcanic')[0] ?? screen.getByText('Volcanic'));

    const slots = useGeologyFormStore.getState().slots;
    expect(slots[1]?.type).toBe('volcanic');
    expect(slots[0]?.type).toBe('ordinary');
  });

  it('points the shared selection at the chosen region', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByRole('tab', { name: 'Region 3' }));

    expect(useViewSyncStore.getState().selectedRegionId).toBe('region-3');
  });

  it('falls back to the first region when the selection leaves the active count', () => {
    useViewSyncStore.setState({ selectedRegionId: 'region-5' });
    useGeologyFormStore.getState().setRegionCount(2);

    renderForm();

    expect(useViewSyncStore.getState().selectedRegionId).toBe('region-1');
  });
});

import { Theme } from '@radix-ui/themes';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';

import { HeightmapForm } from './heightmap-form';
import {
  GEOLOGY_FORM_DEFAULTS,
  HEIGHTMAP_FORM_DEFAULTS,
  useGeologyFormStore,
  useHeightmapFormStore,
  useViewSyncStore,
  VIEW_SYNC_DEFAULTS,
} from '../../../../stores';

function renderForm() {
  return render(
    <Theme>
      <HeightmapForm />
    </Theme>
  );
}

describe('HeightmapForm', () => {
  beforeEach(() => {
    useGeologyFormStore.setState({ ...GEOLOGY_FORM_DEFAULTS });
    useHeightmapFormStore.setState({ ...HEIGHTMAP_FORM_DEFAULTS });
    useViewSyncStore.setState({ ...VIEW_SYNC_DEFAULTS });
  });

  it('shows the global sliders and the first region terrain', () => {
    renderForm();

    expect(screen.getByText('Relief')).toBeInTheDocument();
    expect(screen.getByText('Islets and rocks')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Region 1' })).toBeInTheDocument();
    expect(screen.getByText('Region 1 — Ordinary')).toBeInTheDocument();
    expect(screen.getByText('Mountainousness')).toBeInTheDocument();
  });

  it('switches the terrain editor with the region tab', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByRole('tab', { name: 'Region 3' }));

    expect(useViewSyncStore.getState().selectedRegionId).toBe('region-3');
    expect(screen.getByText('Region 3 — Lagoon')).toBeInTheDocument();
    expect(screen.queryByText('Mountainousness')).not.toBeInTheDocument();
  });

  it('saves terrain slider changes of the selected region', async () => {
    const user = userEvent.setup();
    renderForm();

    const landShare = screen.getAllByRole('slider')[2];
    if (!landShare) {
      throw new Error('The land share slider is missing.');
    }
    landShare.focus();
    await user.keyboard('{ArrowRight}');

    const slots = useHeightmapFormStore.getState().slots;
    expect(slots[0]?.landShare).toBeCloseTo(0.55, 6);
    expect(slots[1]?.landShare).toBeCloseTo(0.45, 6);
  });

  it('reads the type from geology and the terrain from the heightmap store', () => {
    useGeologyFormStore.getState().setRegion(0, { type: 'fjord' });
    useHeightmapFormStore.getState().setRegionTerrain(0, { landShare: 0.9 });

    renderForm();

    expect(screen.getByText('Region 1 — Fjord')).toBeInTheDocument();
    expect(screen.getByText('90%')).toBeInTheDocument();
  });
});

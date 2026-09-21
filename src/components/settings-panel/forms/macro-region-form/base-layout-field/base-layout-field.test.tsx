import { Theme } from '@radix-ui/themes';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { BaseLayoutField } from './base-layout-field';
import { MACRO_REGION_FORM_DEFAULTS, useMacroRegionFormStore } from '../../../../../stores';
import { baseRegions } from '../../../../../utils/map-generator/stages/macro-region-sizes';

function renderField() {
  render(
    <Theme>
      <BaseLayoutField />
    </Theme>
  );
}

describe('BaseLayoutField', () => {
  beforeEach(() => {
    useMacroRegionFormStore.setState({ ...MACRO_REGION_FORM_DEFAULTS });
  });

  it('marks the active layout and switches it without changing region metadata', async () => {
    const user = userEvent.setup();
    const first = useMacroRegionFormStore.getState().regions[0];
    useMacroRegionFormStore.getState().updateRegion(first.id, { label: 'Safe haven' });
    renderField();

    expect(screen.getByRole('radio', { name: 'Radial' })).toHaveAttribute('aria-checked', 'true');

    await user.click(screen.getByRole('radio', { name: 'Vertical' }));

    const state = useMacroRegionFormStore.getState();
    expect(state.layout).toBe('vertical');
    expect(baseRegions(state.regions)[0].label).toBe('Safe haven');
    expect(
      baseRegions(state.regions).every(
        region => region.geometry.kind === 'band' && region.geometry.axis === 'x'
      )
    ).toBe(true);
    expect(screen.getByRole('radio', { name: 'Vertical' })).toHaveAttribute('aria-checked', 'true');
  });
});

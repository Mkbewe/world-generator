import { Theme } from '@radix-ui/themes';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { RegionCardHeader } from './region-card-header';
import { MACRO_REGION_FORM_DEFAULTS, useMacroRegionFormStore } from '../../../../../../stores';
import { baseRegions } from '../../../../../../utils/map-generator/stages/macro-region/boundary-model';

/** Mirrors the section: the card reads its region from the store. */
function Harness({ canRemove = true }: { canRemove?: boolean }) {
  const region = useMacroRegionFormStore(state => state.regions[0]);
  return <RegionCardHeader region={region} index={0} canRemove={canRemove} />;
}

describe('RegionCardHeader', () => {
  beforeEach(() => {
    useMacroRegionFormStore.setState({ ...MACRO_REGION_FORM_DEFAULTS });
  });

  it('edits the region label and removes the region', async () => {
    const user = userEvent.setup();
    render(
      <Theme>
        <Harness />
      </Theme>
    );

    const input = screen.getByLabelText('Region label');
    await user.clear(input);
    await user.type(input, 'Home');

    expect(useMacroRegionFormStore.getState().regions[0].label).toBe('Home');

    await user.click(screen.getByRole('button', { name: 'Remove Home' }));

    expect(baseRegions(useMacroRegionFormStore.getState().regions)).toHaveLength(3);
  });

  it('disables removal when it is not allowed', () => {
    render(
      <Theme>
        <Harness canRemove={false} />
      </Theme>
    );

    expect(screen.getByRole('button', { name: /Remove/ })).toBeDisabled();
  });
});

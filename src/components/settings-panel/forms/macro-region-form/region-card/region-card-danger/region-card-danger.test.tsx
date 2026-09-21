import { Theme } from '@radix-ui/themes';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { RegionCardDanger } from './region-card-danger';
import { MACRO_REGION_FORM_DEFAULTS, useMacroRegionFormStore } from '../../../../../../stores';

describe('RegionCardDanger', () => {
  beforeEach(() => {
    useMacroRegionFormStore.setState({ ...MACRO_REGION_FORM_DEFAULTS });
  });

  it('shows the region danger and commits keyboard changes', async () => {
    const user = userEvent.setup();
    const region = useMacroRegionFormStore.getState().regions[0];
    render(
      <Theme>
        <RegionCardDanger region={region} />
      </Theme>
    );

    const slider = within(screen.getByLabelText('Danger')).getByRole('slider');
    expect(slider).toHaveAttribute('aria-valuenow', '0');

    slider.focus();
    await user.keyboard('{ArrowRight}');

    expect(useMacroRegionFormStore.getState().regions[0].danger).toBeCloseTo(0.05);
  });
});

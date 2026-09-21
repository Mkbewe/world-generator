import { Theme } from '@radix-ui/themes';
import { render, screen, within } from '@testing-library/react';

import { BaseRegionCard } from './base-region-card';
import { MACRO_REGION_FORM_DEFAULTS, useMacroRegionFormStore } from '../../../../../../stores';

describe('BaseRegionCard', () => {
  beforeEach(() => {
    useMacroRegionFormStore.setState({ ...MACRO_REGION_FORM_DEFAULTS });
  });

  it('shows the region header, width and danger', () => {
    const region = useMacroRegionFormStore.getState().regions[0];
    render(
      <Theme>
        <BaseRegionCard region={region} index={0} percent={25} canRemove />
      </Theme>
    );

    expect(screen.getByLabelText('Region label')).toHaveValue(region.label);
    expect(screen.getByText('Width')).toBeInTheDocument();
    expect(screen.getByText('25%')).toBeInTheDocument();
    expect(within(screen.getByLabelText('Danger')).getByRole('slider')).toBeInTheDocument();
  });
});

import { Theme } from '@radix-ui/themes';
import { render, screen, within } from '@testing-library/react';

import { BaseRegionCard } from './base-region-card';
import { MACRO_REGION_FORM_DEFAULTS, useMacroRegionFormStore } from '../../../../../../../stores';

describe('BaseRegionCard', () => {
  beforeEach(() => {
    useMacroRegionFormStore.setState({ ...MACRO_REGION_FORM_DEFAULTS });
  });

  it('shows the region header, selection controls and danger', () => {
    const region = useMacroRegionFormStore.getState().regions[0];
    render(
      <Theme>
        <BaseRegionCard
          region={region}
          index={0}
          canRemove
          selectionIds={['region-1', 'region-2']}
          selectedId='region-1'
          onSelect={() => {}}
        />
      </Theme>
    );

    expect(screen.getByLabelText('Region label')).toHaveValue(region.label);
    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Next' })).toBeEnabled();
    expect(within(screen.getByLabelText('Danger')).getByRole('slider')).toBeInTheDocument();
  });
});

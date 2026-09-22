import { Theme } from '@radix-ui/themes';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ArchetypePoolField } from './archetype-pool-field';
import { LANDMASS_FORM_DEFAULTS, useLandmassFormStore } from '../../../../../stores';
import { LANDMASS_ARCHETYPES } from '../../../../../utils/map-generator/stages/landmass-layout/archetypes';

function renderField() {
  render(
    <Theme>
      <ArchetypePoolField />
    </Theme>
  );
}

describe('ArchetypePoolField', () => {
  beforeEach(() => {
    useLandmassFormStore.setState({ ...LANDMASS_FORM_DEFAULTS });
  });

  it('enables every archetype by default', () => {
    renderField();

    expect(screen.getAllByRole('checkbox')).toHaveLength(LANDMASS_ARCHETYPES.length);
    expect(screen.getByRole('checkbox', { name: 'Round' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Atoll' })).toBeChecked();
  });

  it('clears and restores the whole pool with one button', async () => {
    const user = userEvent.setup();
    renderField();

    await user.click(screen.getByRole('button', { name: 'Clear' }));

    expect(screen.getByRole('checkbox', { name: 'Round' })).not.toBeChecked();
    expect(useLandmassFormStore.getState().landmasses.archetypes).toEqual([]);

    await user.click(screen.getByRole('button', { name: 'Select all' }));

    expect(screen.getByRole('checkbox', { name: 'Round' })).toBeChecked();
    expect(useLandmassFormStore.getState().landmasses.archetypes).toBeUndefined();
  });

  it('narrows the pool when an archetype is unchecked', async () => {
    const user = userEvent.setup();
    renderField();

    await user.click(screen.getByRole('checkbox', { name: 'Winding' }));

    expect(screen.getByRole('checkbox', { name: 'Winding' })).not.toBeChecked();
    expect(useLandmassFormStore.getState().landmasses.archetypes).not.toContain('winding');
  });
});

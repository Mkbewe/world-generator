import { Theme } from '@radix-ui/themes';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ArchetypePoolField } from './archetype-pool-field';
import { LANDMASS_FORM_DEFAULTS, useLandmassFormStore } from '../../../../../stores';
import { LANDMASS_ARCHETYPES } from '../../../../../utils/map-generator/stages/landmass';
import { DEFAULT_LANDMASS_CONFIG } from '../../../../../utils/map-generator/stages/landmass/defaults';

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
    expect(screen.getByRole('checkbox', { name: 'Lagoon' })).toBeChecked();
  });

  it('restores the whole pool with one button', async () => {
    const user = userEvent.setup();
    renderField();

    await user.click(screen.getByRole('checkbox', { name: 'Round' }));

    expect(screen.getByRole('checkbox', { name: 'Round' })).not.toBeChecked();
    expect(useLandmassFormStore.getState().landmasses.archetypes).not.toContain('round');

    await user.click(screen.getByRole('button', { name: 'Select all' }));

    expect(screen.getByRole('checkbox', { name: 'Round' })).toBeChecked();
    expect(useLandmassFormStore.getState().landmasses.archetypes).toBeUndefined();
    // Nothing left to select, so the button disappears.
    expect(screen.queryByRole('button', { name: 'Select all' })).not.toBeInTheDocument();
  });

  it('narrows the pool when an archetype is unchecked', async () => {
    const user = userEvent.setup();
    renderField();

    await user.click(screen.getByRole('checkbox', { name: 'Lagoon' }));

    expect(screen.getByRole('checkbox', { name: 'Lagoon' })).not.toBeChecked();
    expect(useLandmassFormStore.getState().landmasses.archetypes).not.toContain('lagoon');
  });

  it('keeps the last intent enabled instead of emptying the pool', async () => {
    const user = userEvent.setup();
    useLandmassFormStore.setState({
      landmasses: { ...DEFAULT_LANDMASS_CONFIG, archetypes: ['round'] },
    });
    renderField();

    await user.click(screen.getByRole('checkbox', { name: 'Round' }));

    expect(screen.getByRole('checkbox', { name: 'Round' })).toBeChecked();
    expect(useLandmassFormStore.getState().landmasses.archetypes).toEqual(['round']);
  });
});

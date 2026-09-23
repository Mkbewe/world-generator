import {
  LANDMASS_FORM_DEFAULTS,
  selectedArchetypes,
  useLandmassFormStore,
} from './landmass-form-store';
import { DEFAULT_LANDMASS_CONFIG } from '../../utils/map-generator/stages/landmass-defaults';
import { LANDMASS_ARCHETYPES } from '../../utils/map-generator/stages/landmass-layout/archetypes';

describe('useLandmassFormStore', () => {
  beforeEach(() => {
    useLandmassFormStore.setState({ ...LANDMASS_FORM_DEFAULTS });
  });

  it('starts with the default landmass configuration', () => {
    const { landmasses } = useLandmassFormStore.getState();

    expect(landmasses).toEqual(DEFAULT_LANDMASS_CONFIG);
    expect(selectedArchetypes(landmasses)).toEqual([...LANDMASS_ARCHETYPES]);
  });

  it('updates the count, size and diversity the stage renders', () => {
    const store = useLandmassFormStore.getState();
    store.setCount(3);
    store.setSize(0.8);
    store.setDiversity(0.9);

    expect(useLandmassFormStore.getState().landmasses).toMatchObject({
      count: 3,
      size: 0.8,
      diversity: 0.9,
    });
  });

  it('narrows the archetype pool and drops it when everything is enabled', () => {
    const { setArchetypes } = useLandmassFormStore.getState();
    setArchetypes(LANDMASS_ARCHETYPES.filter(archetype => archetype !== 'round'));

    expect(useLandmassFormStore.getState().landmasses.archetypes).toEqual(
      LANDMASS_ARCHETYPES.filter(archetype => archetype !== 'round')
    );

    setArchetypes([...LANDMASS_ARCHETYPES]);

    expect(useLandmassFormStore.getState().landmasses.archetypes).toBeUndefined();
  });

  it('keeps the pool in the archetype order and never empties it', () => {
    const { setArchetypes } = useLandmassFormStore.getState();
    setArchetypes(['atoll', 'round']);

    expect(useLandmassFormStore.getState().landmasses.archetypes).toEqual(['round', 'atoll']);

    setArchetypes([]);

    // A valid configuration always draws at least one structure.
    expect(useLandmassFormStore.getState().landmasses.archetypes).toEqual(['round', 'atoll']);
  });
});

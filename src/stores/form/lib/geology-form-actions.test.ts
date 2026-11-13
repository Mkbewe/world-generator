import { geologyPresetConfig } from '@generator/stages/geology';
import { defaultRegionTerrain } from '@generator/stages/heightmap';

import { applyGeologyPreset, updateGeologicalRegion } from './geology-form-actions';
import { GEOLOGY_FORM_DEFAULTS, useGeologyFormStore } from '../geology-form';
import { HEIGHTMAP_FORM_DEFAULTS, useHeightmapFormStore } from '../heightmap-form';

describe('geology form actions', () => {
  beforeEach(() => {
    useGeologyFormStore.setState({ ...GEOLOGY_FORM_DEFAULTS });
    useHeightmapFormStore.setState({ ...HEIGHTMAP_FORM_DEFAULTS });
  });

  it('applies a preset together with the terrain defaults of its regions', () => {
    const preset = geologyPresetConfig('mosaic');
    const heightmap = useHeightmapFormStore.getState().heightmap;

    applyGeologyPreset('mosaic');

    const geology = useGeologyFormStore.getState();
    expect(geology.regionCount).toBe(preset.regionCount);
    expect(geology.layout).toEqual(preset.layout);

    const terrains = useHeightmapFormStore.getState().slots;
    for (const [index, region] of preset.regions.entries()) {
      expect(terrains[index]).toEqual(defaultRegionTerrain(region.type));
    }
    expect(useHeightmapFormStore.getState().heightmap).toBe(heightmap);
  });

  it('resets only the edited terrain when a region type changes', () => {
    useGeologyFormStore.getState().setRegion(0, { size: 1.5 });
    const heightmap = useHeightmapFormStore.getState().heightmap;
    const otherTerrain = useHeightmapFormStore.getState().slots[1];

    updateGeologicalRegion(0, { type: 'lagoon' });

    expect(useGeologyFormStore.getState().slots[0]).toMatchObject({
      type: 'lagoon',
      size: 1.5,
    });
    const terrains = useHeightmapFormStore.getState().slots;
    expect(terrains[0]).toEqual(defaultRegionTerrain('lagoon'));
    expect(terrains[1]).toBe(otherTerrain);
    expect(useHeightmapFormStore.getState().heightmap).toBe(heightmap);
  });

  it('leaves the terrain alone for patches without a type change', () => {
    const terrains = useHeightmapFormStore.getState().slots;

    updateGeologicalRegion(0, { size: 1.8 });

    expect(useGeologyFormStore.getState().slots[0]?.size).toBe(1.8);
    expect(useHeightmapFormStore.getState().slots).toBe(terrains);
  });
});

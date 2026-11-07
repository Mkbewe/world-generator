import type { MessageKey } from '../../../../../i18n';
import type { RegionTerrainParameter } from '../../../../../utils/map-generator';
import type { RegionTerrainConfig } from '../../../../../utils/map-generator/types';

export interface TerrainSliderOption {
  readonly id: RegionTerrainParameter;
  readonly labelKey: MessageKey;
  readonly descriptionKey: MessageKey;
  readonly rangeLabelKeys: readonly [minimum: MessageKey, maximum: MessageKey];
}

/** Region terrain sliders in display order. */
export const TERRAIN_SLIDER_OPTIONS: readonly TerrainSliderOption[] = [
  {
    id: 'landShare',
    labelKey: 'forms.heightmap.landShare',
    descriptionKey: 'forms.heightmap.landShareDescription',
    rangeLabelKeys: ['forms.heightmap.landShareMin', 'forms.heightmap.landShareMax'],
  },
  {
    id: 'concentration',
    labelKey: 'forms.heightmap.concentration',
    descriptionKey: 'forms.heightmap.concentrationDescription',
    rangeLabelKeys: ['forms.heightmap.concentrationMin', 'forms.heightmap.concentrationMax'],
  },
  {
    id: 'clustering',
    labelKey: 'forms.heightmap.clustering',
    descriptionKey: 'forms.heightmap.clusteringDescription',
    rangeLabelKeys: ['forms.heightmap.clusteringMin', 'forms.heightmap.clusteringMax'],
  },
  {
    id: 'age',
    labelKey: 'forms.heightmap.age',
    descriptionKey: 'forms.heightmap.ageDescription',
    rangeLabelKeys: ['forms.heightmap.ageMin', 'forms.heightmap.ageMax'],
  },
  {
    id: 'mountainousness',
    labelKey: 'forms.heightmap.mountainousness',
    descriptionKey: 'forms.heightmap.mountainousnessDescription',
    rangeLabelKeys: ['forms.heightmap.mountainousnessMin', 'forms.heightmap.mountainousnessMax'],
  },
  {
    id: 'ringShare',
    labelKey: 'forms.heightmap.ringShare',
    descriptionKey: 'forms.heightmap.ringShareDescription',
    rangeLabelKeys: ['forms.heightmap.ringShareMin', 'forms.heightmap.ringShareMax'],
  },
];

/** Region patch of one terrain slider without computed-key casts. */
export function terrainParameterPatch(
  parameter: RegionTerrainParameter,
  value: number
): Partial<RegionTerrainConfig> {
  switch (parameter) {
    case 'landShare':
      return { landShare: value };
    case 'concentration':
      return { concentration: value };
    case 'clustering':
      return { clustering: value };
    case 'age':
      return { age: value };
    case 'mountainousness':
      return { mountainousness: value };
    case 'ringShare':
      return { ringShare: value };
  }
}

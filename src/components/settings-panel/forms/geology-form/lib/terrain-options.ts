import type { RegionTerrainParameter } from '../../../../../utils/map-generator';
import type { GeologicalRegionConfig } from '../../../../../utils/map-generator/types';

export interface TerrainSliderOption {
  readonly id: RegionTerrainParameter;
  readonly label: string;
  readonly description: string;
  readonly rangeLabels: readonly [minimum: string, maximum: string];
}

/** Region terrain sliders in display order. */
export const TERRAIN_SLIDER_OPTIONS: readonly TerrainSliderOption[] = [
  {
    id: 'concentration',
    label: 'Land concentration',
    description: 'Whether the land gathers into one large island or scatters into many.',
    rangeLabels: ['One island', 'Archipelago'],
  },
  {
    id: 'mountainousness',
    label: 'Mountainousness',
    description: 'How high the land rises above the sea level.',
    rangeLabels: ['Gentle hills', 'Steep mountains'],
  },
  {
    id: 'landShare',
    label: 'Land share',
    description: 'How much of the region reaches above the sea level.',
    rangeLabels: ['Sparse islands', 'Solid land'],
  },
];

/** Region patch of one terrain slider without computed-key casts. */
export function terrainParameterPatch(
  parameter: RegionTerrainParameter,
  value: number
): Partial<GeologicalRegionConfig> {
  switch (parameter) {
    case 'concentration':
      return { concentration: value };
    case 'mountainousness':
      return { mountainousness: value };
    case 'landShare':
      return { landShare: value };
  }
}

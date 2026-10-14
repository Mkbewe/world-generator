import type { RegionTerrainParameter } from '../../../../../utils/map-generator';
import type { RegionTerrainConfig } from '../../../../../utils/map-generator/types';

export interface TerrainSliderOption {
  readonly id: RegionTerrainParameter;
  readonly label: string;
  readonly description: string;
  readonly rangeLabels: readonly [minimum: string, maximum: string];
}

/** Region terrain sliders in display order. */
export const TERRAIN_SLIDER_OPTIONS: readonly TerrainSliderOption[] = [
  {
    id: 'landShare',
    label: 'Land share',
    description: 'How much of the region rises above the water.',
    rangeLabels: ['Open sea', 'Mostly land'],
  },
  {
    id: 'concentration',
    label: 'Land concentration',
    description: 'Whether the land scatters into an archipelago or gathers into one main island.',
    rangeLabels: ['Archipelago', 'One island'],
  },
  {
    id: 'age',
    label: 'Geological age',
    description:
      'How eroded the islands are: young reliefs stay steep and cliffed, ancient ones soften.',
    rangeLabels: ['Young', 'Ancient'],
  },
  {
    id: 'mountainousness',
    label: 'Mountainousness',
    description: 'How strongly the islands tend to build mountain ridges.',
    rangeLabels: ['Gentle hills', 'Steep mountains'],
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
    case 'age':
      return { age: value };
    case 'mountainousness':
      return { mountainousness: value };
  }
}

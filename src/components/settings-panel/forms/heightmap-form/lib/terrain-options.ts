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
    label: 'Island division',
    description:
      'Whether the land breaks into many smaller islands or gathers into one main island.',
    rangeLabels: ['Many islands', 'One island'],
  },
  {
    id: 'clustering',
    label: 'Island clustering',
    description: 'Whether separate islands spread across the whole region or group close together.',
    rangeLabels: ['Scattered', 'Clustered'],
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
  {
    id: 'ringShare',
    label: 'Lagoon rings',
    description: 'Share of islands shaped as atoll rings with a lagoon instead of solid islets.',
    rangeLabels: ['Solid islets', 'Atoll rings'],
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

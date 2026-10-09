import type { GeologicalRegionType } from '../../map-generator/types';
import type { Color } from '../catalog/layer-spec';

export interface RegionStyle {
  readonly label: string;
  /** Readable character of the region kind, for the map readout. */
  readonly description: string;
  readonly color: Color;
}

/** Label, readable character and colour of every geological region type. */
export const REGION_STYLES: Readonly<Record<GeologicalRegionType, RegionStyle>> = {
  ordinary: {
    label: 'Ordinary',
    description: 'Broad irregular uplifts',
    color: [110, 168, 92],
  },
  volcanic: {
    label: 'Volcanic',
    description: 'Cones and ridges',
    color: [196, 88, 72],
  },
  atoll: {
    label: 'Atoll',
    description: 'Low reef platforms and lagoons',
    color: [72, 158, 170],
  },
};

export function regionStyle(type: GeologicalRegionType): RegionStyle {
  return REGION_STYLES[type];
}

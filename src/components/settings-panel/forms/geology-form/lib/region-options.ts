import {
  GEOLOGICAL_REGION_TYPES,
  type GeologicalRegionType,
} from '../../../../../utils/map-generator';
import { REGION_STYLES } from '../../../../../utils/map-layers';

export interface RegionTypeOption {
  readonly id: GeologicalRegionType;
  readonly label: string;
  readonly description: string;
}

/** Radio options of the region type; labels match the map legend. */
export const REGION_TYPE_OPTIONS: readonly RegionTypeOption[] = GEOLOGICAL_REGION_TYPES.map(id => ({
  id,
  label: REGION_STYLES[id].label,
  description: REGION_STYLES[id].description,
}));

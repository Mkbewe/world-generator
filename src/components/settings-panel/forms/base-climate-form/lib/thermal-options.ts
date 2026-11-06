import { HEAT_ZONE_CLASSES, type HeatZoneClass } from '../../../../../utils/map-generator/types';
import { heatZoneClassLabel } from '../../../../../utils/map-layers';

export interface HeatZoneClassOption {
  readonly id: HeatZoneClass;
  readonly label: string;
}

export const HEAT_ZONE_CLASS_OPTIONS: readonly HeatZoneClassOption[] = HEAT_ZONE_CLASSES.map(
  id => ({ id, label: heatZoneClassLabel(id) })
);

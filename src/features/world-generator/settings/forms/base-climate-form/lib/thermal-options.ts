import { HEAT_ZONE_CLASSES, type HeatZoneClass } from '@generator/types';

import type { MessageKey } from '../../../../../../i18n';

export interface HeatZoneClassOption {
  readonly id: HeatZoneClass;
  readonly labelKey: MessageKey;
}

const HEAT_ZONE_CLASS_KEYS: Readonly<Record<HeatZoneClass, MessageKey>> = {
  cold: 'forms.baseClimate.cold',
  temperate: 'forms.baseClimate.temperate',
  warm: 'forms.baseClimate.warm',
};

export function heatZoneClassKey(thermal: HeatZoneClass): MessageKey {
  return HEAT_ZONE_CLASS_KEYS[thermal];
}

export const HEAT_ZONE_CLASS_OPTIONS: readonly HeatZoneClassOption[] = HEAT_ZONE_CLASSES.map(
  id => ({ id, labelKey: HEAT_ZONE_CLASS_KEYS[id] })
);

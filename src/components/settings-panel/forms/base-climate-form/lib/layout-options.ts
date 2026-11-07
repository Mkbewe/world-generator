import type { MessageKey } from '../../../../../i18n';
import type { HeatZoneLayout } from '../../../../../stores/form/base-climate-form';

export interface HeatZoneLayoutOption {
  readonly id: HeatZoneLayout;
  readonly labelKey: MessageKey;
}

export const HEAT_ZONE_LAYOUT_OPTIONS: readonly HeatZoneLayoutOption[] = [
  { id: 'horizontal', labelKey: 'forms.baseClimate.layoutHorizontal' },
  { id: 'vertical', labelKey: 'forms.baseClimate.layoutVertical' },
  { id: 'rings', labelKey: 'forms.baseClimate.layoutRings' },
];

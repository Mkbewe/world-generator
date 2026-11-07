import type { MessageKey } from '../../../../../i18n';
import type { HeatZoneLayout } from '../../../../../stores/form/base-climate-form';

export interface HeatZoneShareCopy {
  readonly labelKey: MessageKey;
  readonly descriptionKey: MessageKey;
}

export function heatZoneShareCopy(layout: HeatZoneLayout): HeatZoneShareCopy {
  return layout === 'rings'
    ? {
        labelKey: 'forms.baseClimate.ringThickness',
        descriptionKey: 'forms.baseClimate.ringDescription',
      }
    : {
        labelKey: 'forms.baseClimate.bandWidth',
        descriptionKey: 'forms.baseClimate.bandDescription',
      };
}

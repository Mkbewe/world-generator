import type { HeatZoneLayout } from '../../../../../stores/form/base-climate-form';

export interface HeatZoneShareCopy {
  readonly label: string;
  readonly description: string;
}

export function heatZoneShareCopy(layout: HeatZoneLayout): HeatZoneShareCopy {
  return layout === 'rings'
    ? {
        label: 'Ring thickness',
        description:
          'How thick each zone is along the radius. Area grows with the square of the radius.',
      }
    : {
        label: 'Band width',
        description: 'How wide each zone is along the axis. Equal widths cover equal areas.',
      };
}

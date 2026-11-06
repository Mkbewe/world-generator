import type { HeatZoneLayout } from '../../../../../stores/form/base-climate-form';

export interface HeatZoneLayoutOption {
  readonly id: HeatZoneLayout;
  readonly label: string;
}

export const HEAT_ZONE_LAYOUT_OPTIONS: readonly HeatZoneLayoutOption[] = [
  { id: 'horizontal', label: 'Horizontal' },
  { id: 'vertical', label: 'Vertical' },
  { id: 'rings', label: 'Ring' },
];

import { GEOLOGICAL_REGION_TYPES, type GeologicalRegionType } from '@generator';

import type { MessageKey } from '../../../../../../i18n';

export interface RegionTypeOption {
  readonly id: GeologicalRegionType;
  readonly labelKey: MessageKey;
  readonly descriptionKey: MessageKey;
}

const REGION_TYPE_KEYS: Readonly<
  Record<GeologicalRegionType, { labelKey: MessageKey; descriptionKey: MessageKey }>
> = {
  ordinary: {
    labelKey: 'forms.geology.typeOrdinary',
    descriptionKey: 'forms.geology.typeOrdinaryDescription',
  },
  volcanic: {
    labelKey: 'forms.geology.typeVolcanic',
    descriptionKey: 'forms.geology.typeVolcanicDescription',
  },
  lagoon: {
    labelKey: 'forms.geology.typeLagoon',
    descriptionKey: 'forms.geology.typeLagoonDescription',
  },
  fjord: {
    labelKey: 'forms.geology.typeFjord',
    descriptionKey: 'forms.geology.typeFjordDescription',
  },
};

/** Radio options of the region type; labels match the map legend. */
export const REGION_TYPE_OPTIONS: readonly RegionTypeOption[] = GEOLOGICAL_REGION_TYPES.map(id => ({
  id,
  ...REGION_TYPE_KEYS[id],
}));

export function regionTypeOption(type: GeologicalRegionType): RegionTypeOption {
  return {
    id: type,
    ...REGION_TYPE_KEYS[type],
  };
}

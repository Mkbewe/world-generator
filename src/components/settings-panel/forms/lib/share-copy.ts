import type { MacroRegionGeometry } from '@generator/types';

import type { MessageKey } from '../../../../i18n';

/** Name and explanation of a share edited on a distribution bar. */
export interface ShareCopy {
  readonly labelKey: MessageKey;
  readonly descriptionKey: MessageKey;
}

/** Geology regions edit their share of the world's area. */
export const GEOLOGY_SHARE_COPY: ShareCopy = {
  labelKey: 'forms.share.area',
  descriptionKey: 'forms.share.areaDescription',
};

/** Macro region shares are a ring thickness or a band width, never an area. */
export function macroRegionShareCopy(kind: MacroRegionGeometry['kind']): ShareCopy {
  return kind === 'ring'
    ? {
        labelKey: 'forms.share.ringThickness',
        descriptionKey: 'forms.share.ringDescription',
      }
    : {
        labelKey: 'forms.share.bandWidth',
        descriptionKey: 'forms.share.bandDescription',
      };
}

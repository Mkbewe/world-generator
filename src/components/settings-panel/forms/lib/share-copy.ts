import type { MacroRegionGeometry } from '../../../../utils/map-generator/types';

/** Name and explanation of a share edited on a distribution bar. */
export interface ShareCopy {
  readonly label: string;
  readonly description: string;
}

/** Geology regions edit their share of the world's area. */
export const GEOLOGY_SHARE_COPY: ShareCopy = {
  label: 'Area share',
  description: "Each region's share of the world's area.",
};

/** Macro region shares are a ring thickness or a band width, never an area. */
export function macroRegionShareCopy(kind: MacroRegionGeometry['kind']): ShareCopy {
  return kind === 'ring'
    ? {
        label: 'Ring thickness',
        description:
          'How thick the ring is along the radius. Not an area share: area grows with the square of the radius, so equal thicknesses cover different areas.',
      }
    : {
        label: 'Band width',
        description: 'How wide the band is along the axis. Equal widths cover equal areas.',
      };
}

import type { CategoricalBoundaryStyle } from './layer-spec';

/** White separation and the violet selection band of the geology preview. */
export const GEOLOGY_BOUNDARY_STYLE = {
  gutter: {
    halfWidthPx: 2.5,
    fadePx: 1.25,
    color: [255, 255, 255],
  },
  highlight: {
    color: [124, 58, 237],
    innerPx: 3.125,
    bandPx: 2.25,
    fadePx: 0.75,
  },
} as const satisfies CategoricalBoundaryStyle;

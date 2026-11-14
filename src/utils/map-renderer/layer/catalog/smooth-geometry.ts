import type { BoundarySource } from '@layers';

import type { WorldShape } from '../../../world-shape';

/** Continuous geometry available alongside the generated rasters. */
export interface SmoothGeometry {
  readonly shape: WorldShape;
  readonly boundaries?: Readonly<Partial<Record<BoundarySource, (x: number, y: number) => number>>>;
}

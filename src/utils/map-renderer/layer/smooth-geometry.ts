import type { WorldShape } from '../../world-shape';

/** Continuous geometry available alongside the generated rasters. */
export interface SmoothGeometry {
  readonly shape: WorldShape;
  readonly regionAt?: (x: number, y: number) => number;
  readonly landmassAt?: (x: number, y: number) => number;
}

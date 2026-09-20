import type { MapProjection } from '../view/view-transform';

/** Output buffer (presentation size plus margin) with the projection it was drawn with. */
export interface RenderTarget {
  readonly width: number;
  readonly height: number;
  readonly projection: MapProjection;
}

/** Identity of a rendered surface; a different key means the surface is outdated. */
export function targetKey(target: RenderTarget): string {
  const { projection } = target;
  return [target.width, target.height, projection.cellSize, projection.left, projection.top].join(
    ':'
  );
}

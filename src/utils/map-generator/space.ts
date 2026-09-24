import type { MapConfig, MapState, WorldPoint } from './types';

/**
 * Raster grid a space is built over. `WorldDimensions` carries this plus the
 * physical size; the mapping itself only needs the sample counts.
 */
export interface SampleGrid {
  readonly sampleWidth: number;
  readonly sampleHeight: number;
}

/**
 * Shared spatial port of the generator: one canonical coordinate frame
 * (normalized 0..1), one cell mapping and one distance function.
 *
 * Stages must reach coordinates and distances only through this port — never
 * through a local divisor, `Math.hypot` or a second normalization. Import the
 * distance from here, never recompute it: `planarDistance` below is the only
 * implementation in the codebase.
 *
 * Topology (§7: cylinder wrapping, periodic noise) plugs in by replacing the
 * internals of this module — `distance`, the cell mappings and the sampling
 * hooks — never as a `wrap` branch inside a stage.
 */
export interface WorldSpace {
  readonly sampleWidth: number;
  readonly sampleHeight: number;
  /** Normalized 0..1 position of a cell centre column/row. */
  cellToNormalized(x: number, y: number): WorldPoint;
  /** Nearest cell of a normalized position, clamped to the raster. */
  normalizedToCell(u: number, v: number): { readonly x: number; readonly y: number };
  /** Canonical distance of two normalized points. No wrapping yet (§7). */
  distance(left: WorldPoint, right: WorldPoint): number;
  /**
   * Mask-frame coordinates (-1..1) of a cell. Only the world-shape stage may
   * use this: the mask predicate lives in `-1..1`, everything else in 0..1.
   */
  cellToMask(x: number, y: number): WorldPoint;
}

/**
 * The single distance implementation every stage and helper delegates to.
 * No wrapping yet (§7); a future topology replaces this body — and the cell
 * mappings above — instead of branching in callers.
 */
export function planarDistance(left: WorldPoint, right: WorldPoint): number {
  return Math.hypot(right.x - left.x, right.y - left.y);
}

export function createWorldSpace(grid: SampleGrid): WorldSpace {
  const sampleWidth = grid.sampleWidth;
  const sampleHeight = grid.sampleHeight;
  const xDivisor = Math.max(1, sampleWidth - 1);
  const yDivisor = Math.max(1, sampleHeight - 1);

  return {
    sampleWidth,
    sampleHeight,
    cellToNormalized(x, y) {
      return { x: x / xDivisor, y: y / yDivisor };
    },
    normalizedToCell(u, v) {
      const cu = Math.min(1, Math.max(0, u));
      const cv = Math.min(1, Math.max(0, v));
      return {
        x: Math.min(sampleWidth - 1, Math.max(0, Math.round(cu * xDivisor))),
        y: Math.min(sampleHeight - 1, Math.max(0, Math.round(cv * yDivisor))),
      };
    },
    distance(left, right) {
      return planarDistance(left, right);
    },
    cellToMask(x, y) {
      return { x: (2 * x) / xDivisor - 1, y: (2 * y) / yDivisor - 1 };
    },
  };
}

/**
 * Space of a canonical run: the pipeline transports it on the context, direct
 * `MapContext` users (tests, benches) fall back to deriving it from the
 * dimensions. Either way there is exactly one frame per run.
 */
export function spaceOf(context: {
  readonly config: Readonly<MapConfig>;
  readonly state: Readonly<MapState>;
  readonly space?: WorldSpace;
}): WorldSpace {
  return context.space ?? createWorldSpace(context.config.world.dimensions);
}

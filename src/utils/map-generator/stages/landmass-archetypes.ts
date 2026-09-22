import type { LandmassArchetype } from '../types';

/**
 * Every archetype the settings form can enable. The recipes behind them are
 * gone with the old layout; the new topology generator defines its own set.
 */
export const LANDMASS_ARCHETYPES = [
  'round',
  'oval',
  'elongated',
  'irregular',
  'o',
  'c',
  'l',
  'u',
  's',
  'z',
  'v',
  'y',
  'x',
  't',
] as const;

/** Narrows configuration and restored data to a known archetype name. */
export function isLandmassArchetype(value: unknown): value is LandmassArchetype {
  return LANDMASS_ARCHETYPES.some(archetype => archetype === value);
}

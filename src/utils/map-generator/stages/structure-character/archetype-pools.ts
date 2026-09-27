import { type CharacterRanges, LAGOON_RANGES } from './character-ranges';
import type { LandmassArchetype, TerrainCharacter } from '../../types';

export type ZoneSplit = 'chain' | 'spine' | 'rim' | 'point';

/** One planned part of a whole-structure terrain arrangement. */
export interface ZoneIntent {
  readonly split: ZoneSplit;
  readonly characters: readonly TerrainCharacter[];
  /** A second separated stretch retains the first stretch's character. */
  readonly repeatPrevious?: boolean;
}

/** Layout is chosen before characters or positions, so terrain has one intent. */
export interface TerrainLayout {
  readonly id: string;
  readonly weight: number;
  readonly base: readonly TerrainCharacter[];
  readonly zones: readonly ZoneIntent[];
}

export interface ArchetypePool {
  readonly characters: readonly TerrainCharacter[];
  readonly layouts: readonly TerrainLayout[];
  readonly ranges?: CharacterRanges;
}

const ALL: readonly TerrainCharacter[] = ['plains', 'hills', 'mountains'];
const LOW: readonly TerrainCharacter[] = ['plains', 'hills'];
const HIGH: readonly TerrainCharacter[] = ['hills', 'mountains'];

const FLAT: TerrainLayout = { id: 'flat', weight: 0.08, base: ALL, zones: [] };
const RIDGE: TerrainLayout = {
  id: 'ridge',
  weight: 0.3,
  base: LOW,
  zones: [
    { split: 'spine', characters: HIGH },
    { split: 'chain', characters: ALL },
  ],
};
const BASIN: TerrainLayout = {
  id: 'basin',
  weight: 0.22,
  base: ['plains'],
  zones: [
    { split: 'rim', characters: HIGH },
    { split: 'rim', characters: HIGH, repeatPrevious: true },
  ],
};
const COAST: TerrainLayout = {
  id: 'coast',
  weight: 0.18,
  base: HIGH,
  zones: [
    { split: 'rim', characters: ['plains'] },
    { split: 'rim', characters: ['plains'], repeatPrevious: true },
  ],
};
const SEGMENTS: TerrainLayout = {
  id: 'segments',
  weight: 0.22,
  base: ALL,
  zones: [
    { split: 'chain', characters: ALL },
    { split: 'point', characters: HIGH },
  ],
};

export const ARCHETYPE_POOLS: Readonly<Record<LandmassArchetype, ArchetypePool>> = {
  lagoon: {
    characters: ['plains'],
    layouts: [{ id: 'flat', weight: 1, base: ['plains'], zones: [] }],
    ranges: LAGOON_RANGES,
  },
  round: {
    characters: ALL,
    layouts: [FLAT, RIDGE, BASIN, SEGMENTS],
  },
  irregular: {
    characters: ALL,
    layouts: [FLAT, RIDGE, BASIN, COAST, SEGMENTS],
  },
  elongated: {
    characters: LOW,
    layouts: [
      { id: 'flat', weight: 0.08, base: LOW, zones: [] },
      {
        id: 'ridge',
        weight: 0.35,
        base: ['plains'],
        zones: [
          { split: 'spine', characters: ['hills'] },
          { split: 'chain', characters: LOW },
        ],
      },
      {
        id: 'basin',
        weight: 0.22,
        base: ['plains'],
        zones: [
          { split: 'rim', characters: ['hills'] },
          { split: 'rim', characters: ['hills'], repeatPrevious: true },
        ],
      },
      {
        id: 'segments',
        weight: 0.35,
        base: LOW,
        zones: [
          { split: 'chain', characters: LOW },
          { split: 'chain', characters: LOW, repeatPrevious: true },
        ],
      },
    ],
  },
  branched: {
    characters: ALL,
    layouts: [FLAT, RIDGE, BASIN, COAST, SEGMENTS],
  },
};

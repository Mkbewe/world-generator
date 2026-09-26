import { type CharacterRanges, LAGOON_RANGES } from './character-ranges';
import type { LandmassArchetype, TerrainCharacter } from '../../types';

/** How a large structure may be split into a second character zone. */
export type ZoneSplit = 'none' | 'half' | 'center' | 'edge' | 'point';

export interface SplitWeight {
  readonly split: ZoneSplit;
  readonly weight: number;
}

/**
 * Behaviour of one archetype as data: the characters it may draw, the split
 * weights, and every rule that used to be an archetype `if` — its own value
 * ranges, a fixed split axis and the preferred second characters.
 */
export interface ArchetypePool {
  readonly characters: readonly TerrainCharacter[];
  readonly splits: readonly SplitWeight[];
  /** Value ranges override; `lagoon` keeps the flat, feature-free plains. */
  readonly ranges?: CharacterRanges;
  /** Fixed split axis; absent means the structure picks x or y itself. */
  readonly splitAxis?: 'along' | 'x' | 'y';
  /** Preferred second characters for a `center` split, then the rest. */
  readonly centerSecondary?: readonly TerrainCharacter[];
  /** Preferred second characters for a `half` split, then the rest. */
  readonly halfSecondary?: readonly TerrainCharacter[];
}

const ALL_SECONDARY: readonly TerrainCharacter[] = ['mountains', 'hills', 'plains'];

export const ARCHETYPE_POOLS: Readonly<Record<LandmassArchetype, ArchetypePool>> = {
  lagoon: {
    characters: ['plains'],
    splits: [{ split: 'none', weight: 1 }],
    ranges: LAGOON_RANGES,
  },
  round: {
    characters: ['plains', 'hills', 'mountains'],
    splits: [
      { split: 'half', weight: 0.5 },
      { split: 'center', weight: 0.5 },
    ],
    centerSecondary: ['mountains', 'hills'],
    halfSecondary: ['plains', 'hills'],
  },
  irregular: {
    characters: ['plains', 'hills', 'mountains'],
    splits: [
      { split: 'half', weight: 0.45 },
      { split: 'center', weight: 0.3 },
      { split: 'edge', weight: 0.15 },
      { split: 'point', weight: 0.1 },
    ],
    centerSecondary: ['mountains', 'hills'],
    halfSecondary: ['plains', 'hills'],
  },
  elongated: {
    characters: ['plains', 'hills'],
    splits: [
      { split: 'half', weight: 0.8 },
      { split: 'center', weight: 0.2 },
    ],
    splitAxis: 'along',
    centerSecondary: ['hills', 'plains'],
    halfSecondary: ['plains', 'hills'],
  },
  branched: {
    characters: ['plains', 'hills', 'mountains'],
    splits: [
      { split: 'half', weight: 0.4 },
      { split: 'center', weight: 0.3 },
      { split: 'edge', weight: 0.15 },
      { split: 'point', weight: 0.15 },
    ],
    centerSecondary: ['mountains', 'hills'],
    halfSecondary: ['plains', 'hills'],
  },
};

/** Pool of allowed second characters with the archetype's preference first. */
export function secondaryChoices(
  pool: ArchetypePool,
  primary: TerrainCharacter,
  split: ZoneSplit
): readonly TerrainCharacter[] {
  const options = pool.characters.filter(character => character !== primary);
  if (options.length === 0) {
    return [];
  }
  let preferred: readonly TerrainCharacter[] | undefined;
  if (split === 'center') {
    preferred = pool.centerSecondary;
  } else if (split === 'half') {
    preferred = pool.halfSecondary;
  }
  const ordered = (preferred ?? ALL_SECONDARY).filter(character => options.includes(character));
  return ordered.length > 0 ? ordered : options;
}

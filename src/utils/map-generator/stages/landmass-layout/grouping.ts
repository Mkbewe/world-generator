import type { SeededRandom } from '../../random/seeded-random';
import type { ShelfConfig, ShelfDefinition } from '../../types';

/** Below this count every structure stays isolated. */
const MIN_GROUPED_COUNT = 4;

/** Group sizes sampled for one world. */
const MIN_GROUP_SIZE = 2;
const MAX_GROUP_SIZE = 3;

/** How many groups a world gets at most. */
const MAX_GROUPS = 2;

/**
 * Plans the groups before anything is placed: a world with enough structures
 * always gets one or two clusters while at least one structure stays isolated,
 * so the layout mixes both. Placement may still dissolve a group member that
 * cannot fit; the shelves are built from the final groups.
 */
export function planGroups(count: number, random: SeededRandom): number[][] {
  const order = shuffledIndices(count, random);
  const groupCount = count >= MIN_GROUPED_COUNT ? 1 + Math.floor(random.next() * MAX_GROUPS) : 0;
  const groups: number[][] = [];
  let taken = 0;

  for (let group = 0; group < groupCount; group++) {
    const sampled =
      MIN_GROUP_SIZE + Math.floor(random.next() * (MAX_GROUP_SIZE - MIN_GROUP_SIZE + 1));
    // One structure always stays isolated, so the world mixes groups and loners.
    const size = Math.min(sampled, count - taken - 1);
    if (size < MIN_GROUP_SIZE) {
      break;
    }
    groups.push(order.slice(taken, taken + size));
    taken += size;
  }
  return groups;
}

export interface GroupShelves {
  /** Shelf id per placed structure, keyed by its draft index. */
  readonly shelfOf: ReadonlyMap<number, string>;
  readonly shelves: readonly ShelfDefinition[];
}

/**
 * One shelf per final group, and one per structure that ended up isolated; a
 * structure never shares a shelf with a group it is not part of.
 */
export function createGroupShelves(
  groups: readonly (readonly number[])[],
  placed: readonly number[],
  shelf: ShelfConfig
): GroupShelves {
  const shelfOf = new Map<number, string>();
  const shelves: ShelfDefinition[] = [];

  for (const group of groups) {
    const id = `shelf-${shelves.length + 1}`;
    shelves.push({ id, ...shelf });
    for (const member of group) {
      shelfOf.set(member, id);
    }
  }
  for (const index of placed) {
    if (!shelfOf.has(index)) {
      const id = `shelf-${shelves.length + 1}`;
      shelves.push({ id, ...shelf });
      shelfOf.set(index, id);
    }
  }
  return { shelfOf, shelves };
}

/** Deterministic Fisher-Yates order of the structure indices. */
function shuffledIndices(count: number, random: SeededRandom): number[] {
  const order = Array.from({ length: count }, (_, index) => index);
  for (let index = order.length - 1; index > 0; index--) {
    const swap = Math.floor(random.next() * (index + 1));
    [order[index], order[swap]] = [order[swap], order[index]];
  }
  return order;
}

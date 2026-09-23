import {
  clearanceFrom,
  entryOf,
  insideWorldShare,
  type PlacedEntry,
  segmentsDistance,
  structureDistance,
  StructureIndex,
  type WorldSampler,
} from './collision';
import {
  distanceBetween,
  rotateStructure,
  scaleStructure,
  structureBounds,
  structureCentre,
  structureDirection,
  structureRadius,
  structureSegments,
  translateStructure,
} from './geometry';
import { createGroupShelves, planGroups } from './grouping';
import type { StructureDraft } from './types';
import type { SeededRandom } from '../../random/seeded-random';
import type { GeologicalStructure, ShelfConfig, ShelfDefinition, WorldPoint } from '../../types';
import { LANDMASS_GROUP_DISTANCE, STRUCTURE_GAP } from '../landmass-defaults';

/** Shrink steps tried until a structure fits the free space. */
const PLACEMENT_SHRINKS = [1, 0.85, 0.7, 0.55, 0.42, 0.32, 0.24];

/** Rotations tried per position. */
const PLACEMENT_ROTATIONS = 6;

/** Share of the influence corridor that must stay inside the world. */
const INSIDE_SHARE = 0.5;

/** Positions tried per shrink: first near the free anchor, then anywhere. */
const POSITION_ATTEMPTS = 12;
const ANCHOR_ATTEMPTS = 6;
const SAFE_ATTEMPTS = 8;

/** How far a tried position may drift from its anchor. */
const ANCHOR_DRIFT = 0.12;

/** Widest influence gap between two members of one group. */
const GROUP_GAP = Math.min(0.1, LANDMASS_GROUP_DISTANCE);

/** Attempts to fit a member next to its group. */
const GROUP_ATTEMPTS = 12;

/** Groups start no further than this from the world centre, so they can spread. */
const GROUP_CENTRE_LIMIT = 0.25;

/** Relaxation passes that push apart structures a crowded world overlapped. */
const SEPARATION_PASSES = 8;

export interface PlacementResult {
  readonly structures: readonly GeologicalStructure[];
  readonly shelves: readonly ShelfDefinition[];
  /** Structures the world could not take without a collision. */
  readonly dropped: number;
}

interface Placement {
  readonly entry: PlacedEntry;
  readonly draftIndex: number;
  /** Intended group of the structure; absent for isolated placements. */
  readonly group?: number;
}

interface PlacementState {
  readonly entries: PlacedEntry[];
  readonly index: StructureIndex;
}

interface PlacementContext {
  readonly drafts: readonly StructureDraft[];
  readonly groups: readonly (readonly number[])[];
  readonly state: PlacementState;
  readonly insideWorld: WorldSampler;
  readonly random: SeededRandom;
  readonly shelf: ShelfConfig;
  readonly anchors: readonly WorldPoint[];
  readonly groupAnchors: readonly WorldPoint[];
  readonly placements: Placement[];
}

/**
 * Places every structure of a world with a hard contract: a candidate is taken
 * only when it overlaps nothing and keeps most of its influence inside the
 * world. Groups are placed first and stay atomic — a member that cannot fit
 * next to its group is dissolved and gets its own shelf. Anything the world
 * cannot take is dropped and reported, never left overlapping.
 */
export function placeStructures(
  drafts: readonly StructureDraft[],
  insideWorld: WorldSampler,
  shelf: ShelfConfig,
  random: SeededRandom
): PlacementResult {
  const intended = planGroups(drafts.length, random);
  const anchors = anchorPoints(insideWorld, drafts.length, random);
  const groupAnchors = anchors.filter(anchor => centreDistance(anchor) <= GROUP_CENTRE_LIMIT);
  const context: PlacementContext = {
    drafts,
    groups: intended,
    state: { entries: [], index: new StructureIndex() },
    insideWorld,
    random,
    shelf,
    anchors,
    groupAnchors: groupAnchors.length > 0 ? groupAnchors : anchors,
    placements: [],
  };

  // Groups first, so they still find room; largest-first order within each kind.
  const units = buildUnits(drafts.length, intended).sort(
    (left, right) => Number(right.length > 1) - Number(left.length > 1)
  );

  for (const unit of units) {
    if (unit.length > 1) {
      placeGroup(context, unit);
    } else {
      placeIsolated(context, unit[0]);
    }
  }

  const repaired = validateAndRepair(context.placements, insideWorld);
  // Final groups come from the placements that really survived: a group whose
  // leader failed, or whose member was dissolved or dropped, must not share a
  // shelf across the map.
  const finalGroups = intended
    .map((_, group) =>
      repaired.filter(placement => placement.group === group).map(placement => placement.draftIndex)
    )
    .filter(members => members.length >= 2);
  const { shelfOf, shelves } = createGroupShelves(
    finalGroups,
    repaired.map(placement => placement.draftIndex),
    shelf
  );
  const structures = repaired.map(placement => ({
    ...placement.entry.structure,
    shelfId: shelfOf.get(placement.draftIndex) ?? '',
  }));

  return { structures, shelves, dropped: drafts.length - repaired.length };
}

/** Places one group as a unit: leader first, members side by side next to it. */
function placeGroup(context: PlacementContext, unit: readonly number[]): void {
  const { drafts, state, insideWorld, random, shelf, placements } = context;
  const group = context.groups.findIndex(members => members.includes(unit[0]));
  const leader = findPlacement(drafts[unit[0]], context.groupAnchors, state, insideWorld, random);
  if (!leader) {
    // Without a leader the whole group dissolves into isolated structures.
    for (const member of unit) {
      placeIsolated(context, member);
    }
    return;
  }

  const members: Placement[] = [addPlaced(leader, unit[0], state, group)];
  const limit = shelf.width + GROUP_GAP;

  for (const member of unit.slice(1)) {
    const entry = findGroupMember(drafts[member], members, limit, state, insideWorld, random);
    if (entry) {
      members.push(addPlaced(entry, member, state, group));
    } else {
      // A member that cannot fit next to its group stops being part of it.
      placeIsolated(context, member);
    }
  }
  placements.push(...members);
}

/** Places one structure on its own, dropping it when no spot accepts it. */
function placeIsolated(context: PlacementContext, draftIndex: number): void {
  const entry = findPlacement(
    context.drafts[draftIndex],
    context.anchors,
    context.state,
    context.insideWorld,
    context.random
  );
  if (entry) {
    context.placements.push(addPlaced(entry, draftIndex, context.state));
  }
}

function addPlaced(
  entry: PlacedEntry,
  draftIndex: number,
  state: PlacementState,
  group?: number
): Placement {
  state.index.insert(state.entries.length, entry.bounds);
  state.entries.push(entry);
  return { entry, draftIndex, group };
}

/** First position, rotation and shrink that overlap nothing. */
function findPlacement(
  draft: StructureDraft,
  anchors: readonly WorldPoint[],
  state: PlacementState,
  insideWorld: WorldSampler,
  random: SeededRandom
): PlacedEntry | undefined {
  const centre = structureCentre(draft);
  const start = freeAnchor(anchors, state.entries);

  for (const shrink of PLACEMENT_SHRINKS) {
    const placed = tryPositions(draft, centre, start, shrink, state, insideWorld, random);
    if (placed) {
      return placed;
    }
  }

  // Last resort: many random positions at the smallest shrink.
  const smallest = PLACEMENT_SHRINKS[PLACEMENT_SHRINKS.length - 1];
  for (let attempt = 0; attempt < SAFE_ATTEMPTS; attempt++) {
    const position = randomPointInside(insideWorld, random);
    const placed = tryRotations(draft, centre, position, smallest, state, insideWorld);
    if (placed) {
      return placed;
    }
  }
  return undefined;
}

function tryPositions(
  draft: StructureDraft,
  centre: WorldPoint,
  start: WorldPoint,
  shrink: number,
  state: PlacementState,
  insideWorld: WorldSampler,
  random: SeededRandom
): PlacedEntry | undefined {
  for (let attempt = 0; attempt < POSITION_ATTEMPTS; attempt++) {
    // The first attempts stay near the emptiest anchor, so the layout spreads;
    // the rest sample the whole world, so a crowded spot can always be left.
    const position =
      attempt < ANCHOR_ATTEMPTS
        ? driftAround(start, random)
        : randomPointInside(insideWorld, random);
    const placed = tryRotations(draft, centre, position, shrink, state, insideWorld);
    if (placed) {
      return placed;
    }
  }
  return undefined;
}

function tryRotations(
  draft: StructureDraft,
  centre: WorldPoint,
  position: WorldPoint,
  shrink: number,
  state: PlacementState,
  insideWorld: WorldSampler
): PlacedEntry | undefined {
  for (let step = 0; step < PLACEMENT_ROTATIONS; step++) {
    const candidate = candidateAt(
      draft,
      centre,
      position,
      (step / PLACEMENT_ROTATIONS) * Math.PI * 2,
      shrink
    );
    const bounds = structureBounds(candidate);
    if (insideWorldShare(candidate, insideWorld, bounds) < INSIDE_SHARE) {
      continue;
    }
    const segments = structureSegments(candidate);
    if (clearanceFrom(candidate, state.entries, state.index, segments, bounds) < 0) {
      continue;
    }
    return entryOf({ ...candidate, shelfId: '' }, bounds, segments);
  }
  return undefined;
}

/** Fits a group member next to the group, inside the shared shelf limit. */
function findGroupMember(
  draft: StructureDraft,
  members: readonly Placement[],
  limit: number,
  state: PlacementState,
  insideWorld: WorldSampler,
  random: SeededRandom
): PlacedEntry | undefined {
  const centre = structureCentre(draft);
  const leader = members[0].entry;
  const leaderCentre = structureCentre(leader.structure);
  // Members lie side by side along the group, so the shared shelf covers both.
  const direction = structureDirection(leader.structure);
  const baseRotation = direction - structureDirection(draft);
  const reach = structureRadius(leader.structure) + structureRadius(draft);

  for (const shrink of PLACEMENT_SHRINKS) {
    for (let attempt = 0; attempt < GROUP_ATTEMPTS; attempt++) {
      // The first attempts lie exactly parallel on either side, where the
      // influence tubes cannot cross; later ones add jitter for variety.
      const parallel = attempt < 2;
      const side = attempt % 2 === 0 ? -1 : 1;
      const jitter = parallel ? 0 : random.next() - 0.5;
      const angle = direction + (side * Math.PI) / 2 + jitter * 0.6;
      const gap = STRUCTURE_GAP + random.next() * (GROUP_GAP - STRUCTURE_GAP);
      const spread = parallel ? 0 : random.next() * 0.4;
      const distance = reach + gap + spread;
      const position = {
        x: leaderCentre.x + Math.cos(angle) * distance,
        y: leaderCentre.y + Math.sin(angle) * distance,
      };
      const candidate = candidateAt(draft, centre, position, baseRotation + jitter * 0.4, shrink);
      const bounds = structureBounds(candidate);
      if (insideWorldShare(candidate, insideWorld, bounds) < INSIDE_SHARE) {
        continue;
      }
      const segments = structureSegments(candidate);
      if (clearanceFrom(candidate, state.entries, state.index, segments, bounds) < 0) {
        continue;
      }
      const grouped = members.every(
        member => segmentsDistance(segments, member.entry.segments) <= limit
      );
      if (grouped) {
        return entryOf({ ...candidate, shelfId: '' }, bounds, segments);
      }
    }
  }
  return undefined;
}

/**
 * Hard contract after placement: push apart the rare overlap with bounded moves,
 * then drop whatever still overlaps or sits too far outside the world.
 */
function validateAndRepair(
  placements: readonly Placement[],
  insideWorld: WorldSampler
): Placement[] {
  const result = [...placements];

  for (let pass = 0; pass < SEPARATION_PASSES; pass++) {
    let moved = false;
    for (let left = 0; left < result.length; left++) {
      for (let right = left + 1; right < result.length; right++) {
        const distance = structureDistance(
          result[left].entry.structure,
          result[right].entry.structure
        );
        if (distance >= 0) {
          continue;
        }
        const from = structureCentre(result[left].entry.structure);
        const to = structureCentre(result[right].entry.structure);
        const angle = Math.atan2(to.y - from.y, to.x - from.x);
        const push = STRUCTURE_GAP - distance;
        const candidate = translateStructure(result[right].entry.structure, {
          x: Math.cos(angle) * push,
          y: Math.sin(angle) * push,
        });
        if (insideWorldShare(candidate, insideWorld) >= INSIDE_SHARE) {
          result[right] = { ...result[right], entry: entryOf(candidate) };
          moved = true;
        }
      }
    }
    if (!moved) {
      break;
    }
  }

  const kept: Placement[] = [];
  for (const placement of result) {
    const share = insideWorldShare(placement.entry.structure, insideWorld);
    const overlaps = kept.some(
      other => structureDistance(placement.entry.structure, other.entry.structure) < 0
    );
    if (share >= INSIDE_SHARE && !overlaps) {
      kept.push(placement);
    }
  }
  return kept;
}

/** Clearance of a candidate, with its influence segments computed only once. */

/** Rotates, scales and moves a draft so its centre sits on the position. */
function candidateAt(
  draft: StructureDraft,
  centre: WorldPoint,
  position: WorldPoint,
  rotation: number,
  shrink: number
): StructureDraft {
  const rotated = rotateStructure(draft, rotation, centre);
  const scaled = scaleStructure(rotated, shrink, centre);
  return translateStructure(scaled, { x: position.x - centre.x, y: position.y - centre.y });
}

/**
 * Units preserve the incoming largest-first order while keeping the members of
 * one group together, so a group is placed as a whole.
 */
function buildUnits(count: number, groups: readonly (readonly number[])[]): number[][] {
  const groupOf = new Map<number, number>();
  groups.forEach((group, groupIndex) => group.forEach(member => groupOf.set(member, groupIndex)));
  const done = new Set<number>();
  const units: number[][] = [];

  for (let index = 0; index < count; index++) {
    if (done.has(index)) {
      continue;
    }
    const groupIndex = groupOf.get(index);
    if (groupIndex === undefined) {
      units.push([index]);
      done.add(index);
      continue;
    }
    const members = [...groups[groupIndex]].sort((left, right) => left - right);
    members.forEach(member => done.add(member));
    units.push(members);
  }
  return units;
}

/** Jittered grid anchors inside the world, shuffled deterministically. */
function anchorPoints(
  insideWorld: WorldSampler,
  count: number,
  random: SeededRandom
): WorldPoint[] {
  // More anchors than structures, so a crowded spot can be skipped.
  const columns = Math.max(2, Math.ceil(Math.sqrt(count * 2)));
  const cell = 1 / columns;
  const anchors: WorldPoint[] = [];

  for (let row = 0; row < columns; row++) {
    for (let column = 0; column < columns; column++) {
      const point = {
        x: (column + 0.5 + (random.next() - 0.5) * 0.6) * cell,
        y: (row + 0.5 + (random.next() - 0.5) * 0.6) * cell,
      };
      if (insideWorld(point)) {
        anchors.push(point);
      }
    }
  }

  for (let index = anchors.length - 1; index > 0; index--) {
    const swap = Math.floor(random.next() * (index + 1));
    [anchors[index], anchors[swap]] = [anchors[swap], anchors[index]];
  }
  return anchors.length > 0 ? anchors : [{ x: 0.5, y: 0.5 }];
}

/** Distance of an anchor from the world centre. */
function centreDistance(point: WorldPoint): number {
  return Math.hypot(point.x - 0.5, point.y - 0.5);
}

/** Anchor farthest from every placed structure, so new ones fill free space. */
function freeAnchor(anchors: readonly WorldPoint[], placed: readonly PlacedEntry[]): WorldPoint {
  let best = anchors[0];
  let bestDistance = -Infinity;

  for (const anchor of anchors) {
    let nearest = Infinity;
    for (const entry of placed) {
      nearest = Math.min(nearest, distanceBetween(anchor, structureCentre(entry.structure)));
    }
    if (nearest > bestDistance) {
      bestDistance = nearest;
      best = anchor;
    }
  }
  return best;
}

/** A position near the anchor, so long structures can slide into free space. */
function driftAround(anchor: WorldPoint, random: SeededRandom): WorldPoint {
  const angle = random.next() * Math.PI * 2;
  const distance = random.next() * ANCHOR_DRIFT;
  return {
    x: anchor.x + Math.cos(angle) * distance,
    y: anchor.y + Math.sin(angle) * distance,
  };
}

/** A uniformly sampled position inside the world. */
function randomPointInside(insideWorld: WorldSampler, random: SeededRandom): WorldPoint {
  for (let attempt = 0; attempt < 16; attempt++) {
    const point = { x: random.next(), y: random.next() };
    if (insideWorld(point)) {
      return point;
    }
  }
  return { x: 0.5, y: 0.5 };
}

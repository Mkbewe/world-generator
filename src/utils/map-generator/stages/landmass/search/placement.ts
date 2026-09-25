import {
  anchorPoints,
  centreDistance,
  driftAround,
  freeAnchor,
  GROUP_CENTRE_LIMIT,
  randomPointInside,
} from './anchors';
import {
  clearanceFrom,
  entryOf,
  type PlacedEntry,
  segmentsDistance,
  StructureIndex,
} from './collision';
import type { SeededRandom } from '../../../random/seeded-random';
import type { GeologicalStructure, ShelfConfig, ShelfDefinition, WorldPoint } from '../../../types';
import { LANDMASS_GROUP_DISTANCE, STRUCTURE_GAP } from '../defaults';
import {
  structureBounds,
  structureCentre,
  structureDirection,
  structureRadius,
  structureSegments,
} from '../influence';
import { type EdgeFrame, insideWorldShare, type WorldSampler } from '../mask-sampler';
import type { StructureDraft } from '../shape/draft';
import { buildUnits, createGroupShelves, planGroups } from '../shelves';
import { rotateStructure, scaleStructure, translateStructure } from '../transform';

/** Shrink steps tried until a structure fits the free space. */
const PLACEMENT_SHRINKS = [1, 0.85, 0.7, 0.55, 0.42, 0.32, 0.24];

/** Rotations tried per position. */
const PLACEMENT_ROTATIONS = 6;

/** Share of the influence corridor that must stay inside the ocean margin. */
const INSIDE_SHARE = 0.75;

/** Positions tried per shrink: first near the free anchor, then anywhere. */
const POSITION_ATTEMPTS = 12;
const ANCHOR_ATTEMPTS = 6;
const SAFE_ATTEMPTS = 8;

/** Widest influence gap between two members of one group. */
const GROUP_GAP = Math.min(0.1, LANDMASS_GROUP_DISTANCE);

/** Attempts to fit a member next to its group. */
const GROUP_ATTEMPTS = 12;

export interface PlacementResult {
  readonly structures: readonly GeologicalStructure[];
  readonly shelves: readonly ShelfDefinition[];
  /** Structures the world could not take without a collision. */
  readonly dropped: number;
}

interface PlacedDraft {
  readonly entry: PlacedEntry;
  readonly draftIndex: number;
  /** Intended group of the structure; absent for isolated placements. */
  readonly group?: number;
}

/**
 * Places every structure of a world with a hard contract: a candidate is taken
 * only when it overlaps nothing and keeps most of its influence inside the
 * ocean margin. Groups are placed first and stay atomic — a member that cannot
 * fit next to its group is dissolved and gets its own shelf. Anything the world
 * cannot take is dropped and reported, never left overlapping.
 */
export function placeStructures(
  drafts: readonly StructureDraft[],
  insideWorld: WorldSampler,
  shelf: ShelfConfig,
  random: SeededRandom,
  margin: WorldSampler = insideWorld,
  edgeAt?: (point: WorldPoint) => EdgeFrame
): PlacementResult {
  const intended = planGroups(drafts.length, random);
  const anchors = anchorPoints(insideWorld, drafts.length, random);
  const groupAnchors = anchors.filter(anchor => centreDistance(anchor) <= GROUP_CENTRE_LIMIT);
  return new Placement(
    drafts,
    intended,
    insideWorld,
    margin,
    edgeAt,
    random,
    shelf,
    anchors,
    groupAnchors.length > 0 ? groupAnchors : anchors
  ).run();
}

/** Search state of one placement run: candidates, collisions and survivors. */
class Placement {
  private readonly entries: PlacedEntry[] = [];
  private readonly index = new StructureIndex();
  private readonly placements: PlacedDraft[] = [];

  constructor(
    private readonly drafts: readonly StructureDraft[],
    private readonly groups: readonly (readonly number[])[],
    private readonly insideWorld: WorldSampler,
    private readonly margin: WorldSampler,
    private readonly edgeAt: ((point: WorldPoint) => EdgeFrame) | undefined,
    private readonly random: SeededRandom,
    private readonly shelf: ShelfConfig,
    private readonly anchors: readonly WorldPoint[],
    private readonly groupAnchors: readonly WorldPoint[]
  ) {}

  run(): PlacementResult {
    // Groups first, so they still find room; largest-first order within each kind.
    const units = buildUnits(this.drafts.length, this.groups).sort(
      (left, right) => Number(right.length > 1) - Number(left.length > 1)
    );

    for (const unit of units) {
      if (unit.length > 1) {
        this.placeGroup(unit);
      } else {
        this.placeIsolated(unit[0]);
      }
    }

    const placements = this.placements;
    // Final groups come from the placements that really survived: a group whose
    // leader failed, or whose member was dissolved or dropped, must not share a
    // shelf across the map.
    const finalGroups = this.groups
      .map((_, group) =>
        placements
          .filter(placement => placement.group === group)
          .map(placement => placement.draftIndex)
      )
      .filter(members => members.length >= 2);
    const { shelfOf, shelves } = createGroupShelves(
      finalGroups,
      placements.map(placement => placement.draftIndex),
      this.shelf
    );
    const structures = placements.map(placement => {
      const shelfId = shelfOf.get(placement.draftIndex);
      if (shelfId === undefined) {
        throw new Error(`Placement lost the shelf of structure #${placement.draftIndex}.`);
      }
      return { ...placement.entry.structure, shelfId };
    });

    return {
      structures,
      shelves,
      dropped: this.drafts.length - placements.length,
    };
  }

  /** Places one group as a unit: leader first, members side by side next to it. */
  private placeGroup(unit: readonly number[]): void {
    const group = this.groups.findIndex(members => members.includes(unit[0]));
    const leader = this.findPlacement(this.drafts[unit[0]], this.groupAnchors);
    if (!leader) {
      // Without a leader the whole group dissolves into isolated structures.
      for (const member of unit) {
        this.placeIsolated(member);
      }
      return;
    }

    const members: PlacedDraft[] = [this.addPlaced(leader, unit[0], group)];
    const limit = this.shelf.width + GROUP_GAP;

    for (const member of unit.slice(1)) {
      const entry = this.findGroupMember(this.drafts[member], members, limit);
      if (entry) {
        members.push(this.addPlaced(entry, member, group));
      } else {
        // A member that cannot fit next to its group stops being part of it.
        this.placeIsolated(member);
      }
    }
    this.placements.push(...members);
  }

  /** Places one structure on its own, dropping it when no spot accepts it. */
  private placeIsolated(draftIndex: number): void {
    const entry = this.findPlacement(this.drafts[draftIndex], this.anchors);
    if (entry) {
      this.placements.push(this.addPlaced(entry, draftIndex));
    }
  }

  private addPlaced(entry: PlacedEntry, draftIndex: number, group?: number): PlacedDraft {
    this.index.insert(this.entries.length, entry.bounds);
    this.entries.push(entry);
    return { entry, draftIndex, group };
  }

  /** First position, rotation and shrink that overlap nothing. */
  private findPlacement(
    draft: StructureDraft,
    anchors: readonly WorldPoint[]
  ): PlacedEntry | undefined {
    const centre = structureCentre(draft);
    const start = freeAnchor(anchors, this.entries);

    for (const shrink of PLACEMENT_SHRINKS) {
      const placed = this.tryPositions(draft, centre, start, shrink);
      if (placed) {
        return placed;
      }
    }

    // Last resort: many random positions at the smallest shrink.
    const smallest = PLACEMENT_SHRINKS[PLACEMENT_SHRINKS.length - 1];
    for (let attempt = 0; attempt < SAFE_ATTEMPTS; attempt++) {
      const position = randomPointInside(this.insideWorld, this.random);
      const placed = this.tryRotations(draft, centre, position, smallest);
      if (placed) {
        return placed;
      }
    }
    return undefined;
  }

  private tryPositions(
    draft: StructureDraft,
    centre: WorldPoint,
    start: WorldPoint,
    shrink: number
  ): PlacedEntry | undefined {
    for (let attempt = 0; attempt < POSITION_ATTEMPTS; attempt++) {
      // The first attempts stay near the emptiest anchor, so the layout spreads;
      // the rest sample the whole world, so a crowded spot can always be left.
      const position =
        attempt < ANCHOR_ATTEMPTS
          ? driftAround(start, this.random)
          : randomPointInside(this.insideWorld, this.random);
      const placed = this.tryRotations(draft, centre, position, shrink);
      if (placed) {
        return placed;
      }
    }
    return undefined;
  }

  private tryRotations(
    draft: StructureDraft,
    centre: WorldPoint,
    position: WorldPoint,
    shrink: number
  ): PlacedEntry | undefined {
    // Near the edge the long side goes along the boundary tangent first, so
    // the wide part stays inside; the even sweep below stays as the fallback.
    const aligned = this.alignedRotation(draft, position);
    const rotations =
      aligned === undefined
        ? evenRotations()
        : [aligned, ...evenRotations().filter(angle => angle !== aligned)];
    for (const rotation of rotations) {
      const candidate = candidateAt(draft, centre, position, rotation, shrink);
      const bounds = structureBounds(candidate);
      if (insideWorldShare(candidate, this.margin, bounds) < INSIDE_SHARE) {
        continue;
      }
      const segments = structureSegments(candidate);
      if (clearanceFrom(candidate, this.entries, this.index, segments, bounds) < 0) {
        continue;
      }
      return entryOf(candidate, bounds, segments);
    }
    return undefined;
  }

  /** Tangent-aligned rotation near the world edge, if the edge is known. */
  private alignedRotation(draft: StructureDraft, position: WorldPoint): number | undefined {
    if (!this.edgeAt) {
      return undefined;
    }
    const frame = this.edgeAt(position);
    if (frame.gap >= structureRadius(draft) + GROUP_GAP) {
      return undefined;
    }
    return frame.tangent - structureDirection(draft);
  }

  /** Fits a group member next to the group, inside the shared shelf limit. */
  private findGroupMember(
    draft: StructureDraft,
    members: readonly PlacedDraft[],
    limit: number
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
        const jitter = parallel ? 0 : this.random.next() - 0.5;
        const angle = direction + (side * Math.PI) / 2 + jitter * 0.6;
        const gap = STRUCTURE_GAP + this.random.next() * (GROUP_GAP - STRUCTURE_GAP);
        const spread = parallel ? 0 : this.random.next() * 0.4;
        const distance = reach + gap + spread;
        const position = {
          x: leaderCentre.x + Math.cos(angle) * distance,
          y: leaderCentre.y + Math.sin(angle) * distance,
        };
        const candidate = candidateAt(draft, centre, position, baseRotation + jitter * 0.4, shrink);
        const bounds = structureBounds(candidate);
        if (insideWorldShare(candidate, this.margin, bounds) < INSIDE_SHARE) {
          continue;
        }
        const segments = structureSegments(candidate);
        if (clearanceFrom(candidate, this.entries, this.index, segments, bounds) < 0) {
          continue;
        }
        const grouped = members.every(
          member => segmentsDistance(segments, member.entry.segments) <= limit
        );
        if (grouped) {
          return entryOf(candidate, bounds, segments);
        }
      }
    }
    return undefined;
  }
}

/** Even rotation sweep tried for every candidate position. */
function evenRotations(): number[] {
  return Array.from(
    { length: PLACEMENT_ROTATIONS },
    (_, step) => (step / PLACEMENT_ROTATIONS) * Math.PI * 2
  );
}

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

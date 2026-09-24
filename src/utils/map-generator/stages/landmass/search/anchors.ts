import type { PlacedEntry } from './collision';
import type { SeededRandom } from '../../../random/seeded-random';
import { planarDistance } from '../../../space';
import type { WorldPoint } from '../../../types';
import { distanceBetween, structureCentre } from '../influence';
import type { WorldSampler } from '../mask-sampler';

/** How far a tried position may drift from its anchor. */
const ANCHOR_DRIFT = 0.12;

/** Groups start no further than this from the world centre, so they can spread. */
export const GROUP_CENTRE_LIMIT = 0.25;

/** Jittered grid anchors inside the world, shuffled deterministically. */
export function anchorPoints(
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
export function centreDistance(point: WorldPoint): number {
  return planarDistance(point, { x: 0.5, y: 0.5 });
}

/** Anchor farthest from every placed structure, so new ones fill free space. */
export function freeAnchor(
  anchors: readonly WorldPoint[],
  placed: readonly PlacedEntry[]
): WorldPoint {
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
export function driftAround(anchor: WorldPoint, random: SeededRandom): WorldPoint {
  const angle = random.next() * Math.PI * 2;
  const distance = random.next() * ANCHOR_DRIFT;
  return {
    x: anchor.x + Math.cos(angle) * distance,
    y: anchor.y + Math.sin(angle) * distance,
  };
}

/** A uniformly sampled position inside the world. */
export function randomPointInside(insideWorld: WorldSampler, random: SeededRandom): WorldPoint {
  for (let attempt = 0; attempt < 16; attempt++) {
    const point = { x: random.next(), y: random.next() };
    if (insideWorld(point)) {
      return point;
    }
  }
  return { x: 0.5, y: 0.5 };
}

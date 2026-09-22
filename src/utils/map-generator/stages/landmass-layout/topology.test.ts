import { LANDMASS_ARCHETYPES } from './archetypes';
import { boundsOf } from './geometry';
import { buildStructure, estimateArea, scaleDraft } from './topology';
import type { StructureDraft } from './types';
import { validateLayout } from './validation';
import { SeededRandom } from '../../random/seeded-random';
import type { LandmassArchetype, LandmassEdge, LandmassNode } from '../../types';

/** Wide seed pool: the properties must hold for every sampled structure. */
const SEEDS = Array.from({ length: 100 }, (_, index) => index + 1);

function structure(archetype: LandmassArchetype, seed: number): StructureDraft {
  return buildStructure('landmass-1', archetype, new SeededRandom(seed));
}

function layoutFor(draft: StructureDraft) {
  return {
    structures: [{ ...draft, shelfId: 'shelf-1' }],
    shelves: [{ id: 'shelf-1', width: 0.07, targetDepth: 0.35, falloff: 0.5, irregularity: 0.35 }],
  };
}

/** Ridge length over the widest radius: how slender a structure reads. */
function slenderness(draft: StructureDraft): number {
  const length = draft.edges.reduce((total, edge) => {
    const from = draft.nodes.find(node => node.id === edge.from);
    const to = draft.nodes.find(node => node.id === edge.to);
    return from && to
      ? total + Math.hypot(to.position.x - from.position.x, to.position.y - from.position.y)
      : total;
  }, 0);
  const widest = Math.max(...draft.nodes.map(node => node.radius));
  return length / (2 * widest);
}

/** Sum of the direction changes between consecutive edges. */
function totalDirectionChange(
  nodes: readonly LandmassNode[],
  edges: readonly LandmassEdge[]
): number {
  const angles = edges.map(edge => {
    const from = nodes.find(node => node.id === edge.from);
    const to = nodes.find(node => node.id === edge.to);
    return from && to
      ? Math.atan2(to.position.y - from.position.y, to.position.x - from.position.x)
      : 0;
  });
  let total = 0;
  for (let index = 1; index < angles.length; index++) {
    const delta = angles[index] - angles[index - 1];
    total += Math.abs(Math.atan2(Math.sin(delta), Math.cos(delta)));
  }
  return total;
}

/** Highest number of edges meeting in one node. */
function maxDegree(nodes: readonly LandmassNode[], edges: readonly LandmassEdge[]): number {
  return Math.max(
    ...nodes.map(node => edges.filter(edge => edge.from === node.id || edge.to === node.id).length)
  );
}

describe('landmass topology', () => {
  it('builds a valid connected graph for every archetype and seed', () => {
    for (const archetype of LANDMASS_ARCHETYPES) {
      for (const seed of SEEDS) {
        const draft = structure(archetype, seed);

        expect(draft.nodes.length).toBeGreaterThanOrEqual(2);
        expect(draft.edges.length).toBeGreaterThanOrEqual(1);
        expect(draft.area).toBeGreaterThan(0);
        expect(() => validateLayout(layoutFor(draft))).not.toThrow();
      }
    }
  });

  it('is deterministic per seed and varies between seeds', () => {
    for (const archetype of LANDMASS_ARCHETYPES) {
      expect(structure(archetype, 5)).toEqual(structure(archetype, 5));
      expect(structure(archetype, 5)).not.toEqual(structure(archetype, 17));
    }
  });

  it('reads round as compact and elongated as slender', () => {
    for (const seed of SEEDS) {
      const round = structure('round', seed);
      const bounds = boundsOf(round.nodes.map(node => node.position));
      const widest = Math.max(...round.nodes.map(node => node.radius));
      // The footprint is the node cloud widened by the influence radius.
      const width = bounds.maxX - bounds.minX + 2 * widest;
      const height = bounds.maxY - bounds.minY + 2 * widest;

      expect(Math.max(width, height) / Math.min(width, height)).toBeLessThan(3);
      expect(round.nodes.length).toBeLessThanOrEqual(6);
      expect(slenderness(structure('elongated', seed))).toBeGreaterThan(4);
    }
  });

  it('closes the atoll into a ring with an open middle', () => {
    for (const seed of SEEDS) {
      const atoll = structure('atoll', seed);
      const bounds = boundsOf(atoll.nodes.map(node => node.position));
      const centre = {
        x: (bounds.minX + bounds.maxX) / 2,
        y: (bounds.minY + bounds.maxY) / 2,
      };

      // A ring has as many edges as nodes in its corridor.
      expect(atoll.edges.length).toBeGreaterThanOrEqual(atoll.nodes.length);
      for (const node of atoll.nodes) {
        const distance = Math.hypot(node.position.x - centre.x, node.position.y - centre.y);
        expect(distance).toBeGreaterThan(node.radius * 1.3);
      }
    }
  });

  it('leaves the lagoon open instead of closing it', () => {
    for (const seed of SEEDS) {
      const lagoon = structure('lagoon', seed);
      const first = lagoon.nodes[0];
      const last = lagoon.nodes[lagoon.nodes.length - 1];
      const gap = Math.hypot(
        last.position.x - first.position.x,
        last.position.y - first.position.y
      );
      const widest = Math.max(...lagoon.nodes.map(node => node.radius));

      expect(lagoon.edges.length).toBeLessThanOrEqual(lagoon.nodes.length - 1);
      expect(gap).toBeGreaterThan(widest * 0.5);
    }
  });

  it('grows real branches for the branched intent', () => {
    for (const seed of SEEDS) {
      const branched = structure('branched', seed);

      expect(maxDegree(branched.nodes, branched.edges)).toBeGreaterThanOrEqual(3);
    }
  });

  it('bends the winding intent more than a straight ridge', () => {
    for (const seed of SEEDS) {
      const winding = structure('winding', seed);
      const elongated = structure('elongated', seed);

      expect(totalDirectionChange(winding.nodes, winding.edges)).toBeGreaterThan(1);
      expect(totalDirectionChange(winding.nodes, winding.edges)).toBeGreaterThan(
        totalDirectionChange(elongated.nodes, elongated.edges)
      );
    }
  });

  it('scales positions, radii and area of a draft', () => {
    const draft = structure('elongated', 5);
    const scaled = scaleDraft(draft, 2);

    expect(scaled.nodes[0].radius).toBeCloseTo(draft.nodes[0].radius * 2, 10);
    expect(scaled.area).toBeCloseTo(draft.area * 4, 10);
    expect(estimateArea(scaled.nodes, scaled.edges)).toBeGreaterThan(
      estimateArea(draft.nodes, draft.edges)
    );
  });
});

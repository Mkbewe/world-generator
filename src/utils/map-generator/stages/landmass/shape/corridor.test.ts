import { LANDMASS_ARCHETYPES } from './archetypes';
import { buildStructure, scaleDraft } from './corridor';
import type { StructureDraft } from './draft';
import { SeededRandom } from '../../../random/seeded-random';
import type { LandmassArchetype, LandmassEdge, LandmassNode, WorldPoint } from '../../../types';
import { boundsOf } from '../influence';
import { validateLayout } from '../layout-check';

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
  return directionDeltas(nodes, edges).reduce((sum, delta) => sum + Math.abs(delta), 0);
}

/** Net direction change keeping the sign: hooks to one side accumulate. */
function netDirectionChange(
  nodes: readonly LandmassNode[],
  edges: readonly LandmassEdge[]
): number {
  return directionDeltas(nodes, edges).reduce((sum, delta) => sum + delta, 0);
}

/** Signed turns between consecutive edges, wrapped to [-PI, PI]. */
function directionDeltas(nodes: readonly LandmassNode[], edges: readonly LandmassEdge[]): number[] {
  const angles = edges.map(edge => {
    const from = nodes.find(node => node.id === edge.from);
    const to = nodes.find(node => node.id === edge.to);
    return from && to
      ? Math.atan2(to.position.y - from.position.y, to.position.x - from.position.x)
      : 0;
  });
  const deltas: number[] = [];
  for (let index = 1; index < angles.length; index++) {
    const delta = angles[index] - angles[index - 1];
    deltas.push(Math.atan2(Math.sin(delta), Math.cos(delta)));
  }
  return deltas;
}

/**
 * Sharpest direction change of the main corridor: between consecutive samples
 * along an edge (kinks inside an edge span) and between adjacent node chords
 * at doubly-connected nodes (kinks coinciding with a node). Branch arms are
 * not main corridor geometry, so they never count.
 */
function maxJointTurn(draft: StructureDraft): number {
  const byId = new Map(draft.nodes.map(node => [node.id, node]));
  const mains = draft.edges.filter(edge => !edge.id.includes('-b'));
  const turn = (first: number, second: number): number => {
    const delta = second - first;
    return Math.abs(Math.atan2(Math.sin(delta), Math.cos(delta)));
  };
  const direction = (from: WorldPoint, to: WorldPoint): number =>
    Math.atan2(to.y - from.y, to.x - from.x);
  let sharpest = 0;
  for (const edge of mains) {
    const from = byId.get(edge.from);
    const to = byId.get(edge.to);
    if (!from || !to) {
      continue;
    }
    const points = [from.position, ...(edge.controlPoints ?? []), to.position];
    for (let index = 2; index < points.length; index++) {
      sharpest = Math.max(
        sharpest,
        turn(
          direction(points[index - 2], points[index - 1]),
          direction(points[index - 1], points[index])
        )
      );
    }
  }
  const incident = new Map<string, LandmassNode[]>();
  for (const edge of mains) {
    const from = byId.get(edge.from);
    const to = byId.get(edge.to);
    if (!from || !to) {
      continue;
    }
    incident.set(edge.from, [...(incident.get(edge.from) ?? []), to]);
    incident.set(edge.to, [...(incident.get(edge.to) ?? []), from]);
  }
  for (const [id, neighbours] of incident) {
    const node = byId.get(id);
    const [first, second] = neighbours;
    if (!node || neighbours.length !== 2 || !first || !second) {
      continue;
    }
    // A straight run leaves the two chords opposite; a kink closes them.
    sharpest = Math.max(
      sharpest,
      Math.PI -
        turn(direction(node.position, first.position), direction(node.position, second.position))
    );
  }
  return sharpest;
}

/** Branch arms of a draft: the parent node and the first node of each arm. */
function branchArms(draft: StructureDraft): { parent: LandmassNode; tip: LandmassNode }[] {
  const byId = new Map(draft.nodes.map(node => [node.id, node]));
  const arms = new Map<number, { parent: LandmassNode; tip: LandmassNode }>();
  for (const edge of draft.edges) {
    const match = /-b(\d+)e1$/.exec(edge.id);
    const parent = byId.get(edge.from);
    const tip = byId.get(edge.to);
    if (match && parent && tip) {
      arms.set(Number(match[1]), { parent, tip });
    }
  }
  return [...arms.values()];
}

/** Deflection of the arm from the parent corridor, in radians. */
function armDeflection(
  mains: readonly LandmassNode[],
  arm: { parent: LandmassNode; tip: LandmassNode }
): number {
  const parentIndex = mains.findIndex(node => node.id === arm.parent.id);
  const neighbour = mains[Math.min(mains.length - 1, parentIndex + 1)] ?? arm.parent;
  const along = Math.atan2(
    neighbour.position.y - arm.parent.position.y,
    neighbour.position.x - arm.parent.position.x
  );
  const outward = Math.atan2(
    arm.tip.position.y - arm.parent.position.y,
    arm.tip.position.x - arm.parent.position.x
  );
  const delta = outward - along;
  return Math.abs(Math.atan2(Math.sin(delta), Math.cos(delta)));
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

        expect(draft.nodes.length).toBeGreaterThanOrEqual(1);
        expect(draft.edges.length).toBeGreaterThanOrEqual(draft.nodes.length - 1);
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
      expect(round.nodes.length).toBeLessThanOrEqual(3);
      expect(slenderness(structure('elongated', seed))).toBeGreaterThan(2.5);
    }
  });

  it('keeps round between one and three nodes', () => {
    const counts = new Set<number>();
    for (const seed of SEEDS) {
      const round = structure('round', seed);

      expect(round.nodes.length).toBeGreaterThanOrEqual(1);
      expect(round.nodes.length).toBeLessThanOrEqual(3);
      expect(round.edges.length).toBe(Math.max(0, round.nodes.length - 1));
      expect(() => validateLayout(layoutFor(round))).not.toThrow();
      counts.add(round.nodes.length);
    }

    expect(counts.has(1)).toBe(true);
  });

  it('creases the irregular intent into boxy joints, unlike round', () => {
    // A surviving kink measures the full joint angle; a kink filtered next to
    // a node still leaves two partial turns adding up to it, so every joint
    // reads at least half the smallest joint angle (1.2 / 2).
    for (const seed of SEEDS) {
      expect(maxJointTurn(structure('irregular', seed))).toBeGreaterThan(0.5);
      expect(maxJointTurn(structure('round', seed))).toBeLessThan(0.5);
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

  it('joins the atoll seam without a hook on the first node', () => {
    for (const seed of SEEDS) {
      const atoll = structure('atoll', seed);
      const first = atoll.nodes[0];
      const last = atoll.nodes[atoll.nodes.length - 1];
      const closing = atoll.edges.find(
        edge =>
          (edge.from === last.id && edge.to === first.id) ||
          (edge.from === first.id && edge.to === last.id)
      );

      expect(closing).toBeDefined();
      for (const point of closing?.controlPoints ?? []) {
        expect(Math.hypot(point.x - first.position.x, point.y - first.position.y)).toBeGreaterThan(
          0.005
        );
        expect(Math.hypot(point.x - last.position.x, point.y - last.position.y)).toBeGreaterThan(
          0.005
        );
      }

      const closingLength = Math.hypot(
        last.position.x - first.position.x,
        last.position.y - first.position.y
      );
      const typical = Math.hypot(
        atoll.nodes[1].position.x - first.position.x,
        atoll.nodes[1].position.y - first.position.y
      );
      expect(closingLength).toBeGreaterThan(typical * 0.4);
      expect(closingLength).toBeLessThan(typical * 2.5);
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

  it('sticks one or two irregular branches out at a right angle', () => {
    for (const seed of SEEDS) {
      const draft = structure('irregular', seed);
      const mains = draft.nodes.filter(node => /-n\d+$/.test(node.id));
      const arms = branchArms(draft);

      expect(arms.length).toBeGreaterThanOrEqual(1);
      expect(arms.length).toBeLessThanOrEqual(2);
      for (const arm of arms) {
        expect(armDeflection(mains, arm)).toBeGreaterThan(Math.PI / 2 - 0.5);
        expect(armDeflection(mains, arm)).toBeLessThan(Math.PI / 2 + 0.5);
      }
    }
  });

  it('grows real branches for the branched intent', () => {
    for (const seed of SEEDS) {
      const branched = structure('branched', seed);

      expect(maxDegree(branched.nodes, branched.edges)).toBeGreaterThanOrEqual(3);
    }
  });

  it('bends every elongated visibly, varied, sometimes twice to one side', () => {
    const totals: number[] = [];
    let hooked = 0;
    for (const seed of SEEDS) {
      const draft = structure('elongated', seed);
      const mains = draft.edges.filter(edge => !edge.id.includes('-b'));
      totals.push(totalDirectionChange(draft.nodes, mains));
      if (Math.abs(netDirectionChange(draft.nodes, mains)) > 2) {
        hooked++;
      }
    }

    expect(Math.min(...totals)).toBeGreaterThan(0.4);
    expect(Math.max(...totals) - Math.min(...totals)).toBeGreaterThan(3);
    expect(hooked).toBeGreaterThanOrEqual(10);
  });

  it('varies the segment thickness, most on elongated ridges', () => {
    const spread = (archetype: LandmassArchetype): number[] => {
      const ratios: number[] = [];
      for (const seed of SEEDS) {
        const draft = structure(archetype, seed);
        const radii = draft.nodes.filter(node => /-n\d+$/.test(node.id)).map(node => node.radius);
        ratios.push(Math.max(...radii) / Math.min(...radii));
      }
      return ratios;
    };
    const mean = (values: readonly number[]): number =>
      values.reduce((sum, value) => sum + value, 0) / values.length;

    const elongated = spread('elongated');
    expect(Math.min(...elongated)).toBeGreaterThan(1.5);
    expect(mean(elongated)).toBeGreaterThan(2.2);
    for (const archetype of ['irregular', 'branched', 'lagoon'] as const) {
      expect(mean(spread(archetype))).toBeGreaterThan(1.5);
    }
  });

  it('bends the winding intent more than a compact one', () => {
    for (const seed of SEEDS) {
      const winding = structure('winding', seed);
      const round = structure('round', seed);

      expect(totalDirectionChange(winding.nodes, winding.edges)).toBeGreaterThan(0.5);
      expect(totalDirectionChange(winding.nodes, winding.edges)).toBeGreaterThan(
        totalDirectionChange(round.nodes, round.edges)
      );
    }
  });

  it('scales positions, radii and control points of a draft', () => {
    const draft = structure('elongated', 5);
    const scaled = scaleDraft(draft, 2);

    expect(scaled.nodes[0].radius).toBeCloseTo(draft.nodes[0].radius * 2, 10);
    expect(draft.edges.some(edge => (edge.controlPoints?.length ?? 0) > 0)).toBe(true);

    // Invariant: every point of the geometry moves with the same factor.
    for (const [index, node] of draft.nodes.entries()) {
      expect(scaled.nodes[index].position.x).toBeCloseTo(node.position.x * 2, 10);
      expect(scaled.nodes[index].position.y).toBeCloseTo(node.position.y * 2, 10);
    }
    for (const [index, edge] of draft.edges.entries()) {
      const controls = edge.controlPoints ?? [];
      const scaledControls = scaled.edges[index].controlPoints ?? [];
      expect(scaledControls).toHaveLength(controls.length);
      for (const [at, point] of controls.entries()) {
        expect(scaledControls[at].x).toBeCloseTo(point.x * 2, 10);
        expect(scaledControls[at].y).toBeCloseTo(point.y * 2, 10);
      }
    }
  });
});

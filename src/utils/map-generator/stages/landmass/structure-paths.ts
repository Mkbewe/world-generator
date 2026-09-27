import { interpolatedRadii, type StructureSegment } from './influence';
import type { GeologicalStructure, LandmassEdge, LandmassNode } from '../../types';

/** An ordered, continuous route through the skeleton; fractions use its own length. */
export interface StructurePath {
  readonly id: string;
  readonly segments: readonly StructureSegment[];
  readonly length: number;
  readonly closed: boolean;
}

/** Main corridor followed by each arm, with stable IDs from the source graph. */
export function structurePaths(structure: GeologicalStructure): readonly StructurePath[] {
  const byId = new Map(structure.nodes.map(node => [node.id, node]));
  const main = mainNodes(structure);
  const used = new Set<string>();
  const mainEdges: OrientedEdge[] = [];

  for (let index = 1; index < main.length; index++) {
    const edge = connectingEdge(structure.edges, main[index - 1].id, main[index].id);
    if (!edge) {
      break;
    }
    mainEdges.push({ edge, from: main[index - 1].id, to: main[index].id });
    used.add(edge.id);
  }
  const closing =
    main.length > 2
      ? connectingEdge(structure.edges, main[main.length - 1].id, main[0].id)
      : undefined;
  if (closing && !used.has(closing.id)) {
    mainEdges.push({ edge: closing, from: main[main.length - 1].id, to: main[0].id });
    used.add(closing.id);
  }

  const paths: StructurePath[] = [makePath('main', mainEdges, byId, closing !== undefined)];
  const walk = (start: string, first: LandmassEdge): void => {
    const edges: OrientedEdge[] = [];
    let current = start;
    let edge: LandmassEdge | undefined = first;
    while (edge && !used.has(edge.id)) {
      const next = edge.from === current ? edge.to : edge.from;
      used.add(edge.id);
      edges.push({ edge, from: current, to: next });
      current = next;
      const remaining = structure.edges.filter(
        candidate =>
          (candidate.from === current || candidate.to === current) && !used.has(candidate.id)
      );
      edge = remaining.length === 1 ? remaining[0] : undefined;
    }
    if (edges.length > 0) {
      paths.push(makePath(`branch:${first.id}`, edges, byId, false));
    }
  };

  // Main nodes are branch anchors. A later pass handles branches off branches.
  for (const node of structure.nodes) {
    for (const edge of structure.edges) {
      if ((edge.from === node.id || edge.to === node.id) && !used.has(edge.id)) {
        walk(node.id, edge);
      }
    }
  }
  return paths;
}

interface OrientedEdge {
  readonly edge: LandmassEdge;
  readonly from: string;
  readonly to: string;
}

function mainNodes(structure: GeologicalStructure): readonly LandmassNode[] {
  const count = structure.mainNodeCount ?? structure.nodes.length;
  return structure.nodes.slice(0, count);
}

function connectingEdge(
  edges: readonly LandmassEdge[],
  from: string,
  to: string
): LandmassEdge | undefined {
  return edges.find(
    edge => (edge.from === from && edge.to === to) || (edge.from === to && edge.to === from)
  );
}

function makePath(
  id: string,
  edges: readonly OrientedEdge[],
  nodes: ReadonlyMap<string, LandmassNode>,
  closed: boolean
): StructurePath {
  const segments: StructureSegment[] = [];
  for (const { edge, from, to } of edges) {
    const first = nodes.get(from);
    const last = nodes.get(to);
    if (!first || !last) {
      continue;
    }
    const controls =
      edge.from === from ? (edge.controlPoints ?? []) : [...(edge.controlPoints ?? [])].reverse();
    const points = [first.position, ...controls, last.position];
    const radii = interpolatedRadii(points, first.radius, last.radius);
    for (let index = 1; index < points.length; index++) {
      segments.push({
        from: points[index - 1],
        to: points[index],
        fromRadius: radii[index - 1],
        toRadius: radii[index],
      });
    }
  }
  const length = segments.reduce(
    (sum, segment) =>
      sum + Math.hypot(segment.to.x - segment.from.x, segment.to.y - segment.from.y),
    0
  );
  return { id, segments, length, closed };
}

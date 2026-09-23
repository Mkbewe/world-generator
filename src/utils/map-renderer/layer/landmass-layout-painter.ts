import type { MapSize } from './layer';
import { interpolatedRadii } from '../../map-generator/stages/landmass-layout/geometry';
import {
  type GeologicalStructure,
  type LandmassEdge,
  type LandmassLayout,
  type LandmassNode,
  type WorldPoint,
} from '../../map-generator/types';
import type { Color } from '../../map-layers';
import type { WorldShape } from '../../world-shape';
import type { MapProjection } from '../view/view-transform';
import { traceWorldBoundary } from '../world-boundary-renderer';

/** Calm ocean inside the world, so even a few thin lines still read as a map. */
const OCEAN_COLOR = 'rgb(12, 30, 48)';
const HALO_COLOR = 'rgba(6, 16, 26, 0.6)';

/** Distinct hues that stay calm on the ocean and avoid the boundary green. */
const STRUCTURE_COLORS: readonly Color[] = [
  [94, 204, 176],
  [96, 165, 250],
  [167, 139, 250],
  [244, 114, 182],
  [251, 191, 36],
  [163, 230, 53],
  [45, 212, 191],
  [248, 113, 113],
];

/** Drawing weights relative to one map cell, with a floor in canvas pixels. */
const SKELETON_WEIGHT = 0.02;
const RAIL_WEIGHT = 0.005;
const WIDTH_STROKE_WEIGHT = 0.006;
const NODE_WEIGHT = 0.025;
const BRANCH_SCALE = 1.5;
const MIN_SKELETON_PX = 1.8;
const MIN_RAIL_PX = 0.6;
const MIN_WIDTH_STROKE_PX = 0.9;
const MIN_NODE_PX = 3;
const HALO_EXTRA_PX = 2;
const FILL_ALPHA = 0.07;
const RAIL_ALPHA = 0.18;
const WIDTH_STROKE_ALPHA = 0.55;
const STRAIGHT_ENOUGH = 1e-6;
const TAU = Math.PI * 2;
/** Helper ribs between two real nodes; the body curve can still use denser samples. */
const SPLINE_HANDLE_LIMIT = 0.45;

export interface LandmassScene {
  readonly layout: LandmassLayout;
  readonly size: MapSize;
  /** World shape; it clips the scene and becomes the ocean background. */
  readonly shape?: WorldShape;
}

interface CanvasPoint {
  readonly x: number;
  readonly y: number;
}

/** Influence radius resolved per axis, in canvas pixels. */
interface CanvasRadii {
  readonly x: number;
  readonly y: number;
}

/** One continuous width ribbon of a chain: rails and the fill between them. */
interface CorridorRun {
  readonly points: readonly CanvasPoint[];
  readonly radii: readonly CanvasRadii[];
  readonly left: readonly CanvasPoint[];
  readonly right: readonly CanvasPoint[];
  readonly closed: boolean;
  /** Axis indexes of real nodes, including the repeated first node of a ring. */
  readonly nodeIndexes: readonly number[];
}

interface ChainGeometry {
  readonly points: readonly CanvasPoint[];
  readonly runs: readonly CorridorRun[];
}

interface NodeGeometry {
  readonly point: CanvasPoint;
  readonly tangent: number;
  readonly radii: CanvasRadii;
  readonly branch: boolean;
}

interface StructureGeometry {
  readonly chains: readonly ChainGeometry[];
  readonly nodes: readonly NodeGeometry[];
}

/** Node path of one chain; rings repeat their first node at the end. */
export interface StructureChain {
  readonly path: readonly string[];
  readonly closed: boolean;
}

/** Technical view of a landmass layout: ocean, width wireframe and skeleton. */
export function paintLandmassLayout(
  context: CanvasRenderingContext2D,
  projection: MapProjection,
  scene: LandmassScene
): void {
  if (scene.shape) {
    context.save();
    context.beginPath();
    traceWorldBoundary(context, projection, scene.size, scene.shape);
    context.clip();
  }
  paintOcean(context, projection, scene);
  scene.layout.structures.forEach((structure, index) => {
    paintStructure(context, projection, scene.size, structure, structureColor(index));
  });
  if (scene.shape) {
    context.restore();
  }
}

/** Polyline of one edge, its control points included. */
export function edgePolyline(
  edge: LandmassEdge,
  from: LandmassNode,
  to: LandmassNode
): readonly WorldPoint[] {
  return [from.position, ...(edge.controlPoints ?? []), to.position];
}

/** Direction of the polyline at every point, in canvas space. */
export function pointTangents(points: readonly CanvasPoint[]): readonly number[] {
  return points.map((_, index) => {
    const before = points[Math.max(0, index - 1)];
    const after = points[Math.min(points.length - 1, index + 1)];
    return Math.atan2(after.y - before.y, after.x - before.x);
  });
}

/**
 * Points at the interpolated radii on one side of the polyline. The influence
 * is a circle in normalized space, so in canvas space it is an ellipse; the
 * rail follows that ellipse's support in the local normal direction.
 */
export function sideRail(
  points: readonly CanvasPoint[],
  radii: readonly CanvasRadii[],
  side: -1 | 1,
  closed = false
): readonly CanvasPoint[] {
  const tangents = closed ? closedPointTangents(points) : pointTangents(points);
  return points.map((point, index) => offsetPoint(point, tangents[index], radii[index], side));
}

/**
 * Node paths of a structure: chains between ends or branches, plus rings.
 * Consecutive edges of one chain share their node, so the corridor and its
 * rails are built once per chain instead of once per edge (plan §11.1).
 */
export function structureChains(
  structure: Pick<GeologicalStructure, 'nodes' | 'edges'>
): readonly StructureChain[] {
  const incident = new Map<string, LandmassEdge[]>();
  for (const edge of structure.edges) {
    for (const id of [edge.from, edge.to]) {
      const list = incident.get(id) ?? [];
      list.push(edge);
      incident.set(id, list);
    }
  }
  const visited = new Set<string>();
  const chains: StructureChain[] = [];

  const walk = (start: string, first: LandmassEdge): StructureChain => {
    const path = [start];
    let current = start;
    let edge: LandmassEdge | undefined = first;
    while (edge) {
      visited.add(edge.id);
      const next = edge.from === current ? edge.to : edge.from;
      path.push(next);
      current = next;
      const edges = incident.get(current) ?? [];
      edge = edges.length === 2 ? edges.find(candidate => !visited.has(candidate.id)) : undefined;
    }
    return { path, closed: path.length > 2 && path[0] === path[path.length - 1] };
  };

  for (const node of structure.nodes) {
    const edges = incident.get(node.id) ?? [];
    if (edges.length === 2) {
      continue;
    }
    for (const edge of edges) {
      if (!visited.has(edge.id)) {
        chains.push(walk(node.id, edge));
      }
    }
  }
  for (const edge of structure.edges) {
    if (!visited.has(edge.id)) {
      chains.push(walk(edge.from, edge));
    }
  }
  return chains;
}

/**
 * Local direction of every node: the average line orientation of the edges
 * that touch it. A chain keeps one smooth corridor direction and a branch gets
 * an unambiguous bar instead of one bar per incident edge.
 */
export function nodeTangents(
  structure: Pick<GeologicalStructure, 'nodes' | 'edges'>
): ReadonlyMap<string, number> {
  const byId = new Map(structure.nodes.map(node => [node.id, node]));
  const doubled = new Map<string, { x: number; y: number; first: number }>();
  const add = (id: string, direction: number): void => {
    const entry = doubled.get(id) ?? { x: 0, y: 0, first: direction };
    entry.x += Math.cos(direction * 2);
    entry.y += Math.sin(direction * 2);
    doubled.set(id, entry);
  };

  for (const edge of structure.edges) {
    const from = byId.get(edge.from);
    const to = byId.get(edge.to);
    if (!from || !to) {
      continue;
    }
    const points = edgePolyline(edge, from, to);
    add(edge.from, leavingDirection(points, true));
    add(edge.to, leavingDirection(points, false));
  }

  const tangents = new Map<string, number>();
  for (const node of structure.nodes) {
    const entry = doubled.get(node.id);
    if (!entry || Math.hypot(entry.x, entry.y) < STRAIGHT_ENOUGH) {
      tangents.set(node.id, entry?.first ?? 0);
      continue;
    }
    tangents.set(node.id, Math.atan2(entry.y, entry.x) / 2);
  }
  return tangents;
}

/** Number of edges touching every node; three or more make a branch. */
export function nodeDegrees(
  structure: Pick<GeologicalStructure, 'edges'>
): ReadonlyMap<string, number> {
  const degrees = new Map<string, number>();
  for (const edge of structure.edges) {
    degrees.set(edge.from, (degrees.get(edge.from) ?? 0) + 1);
    degrees.set(edge.to, (degrees.get(edge.to) ?? 0) + 1);
  }
  return degrees;
}

/** Canvas geometry of one structure: one axis per chain, one bar per node. */
export function structureGeometry(
  structure: GeologicalStructure,
  projection: MapProjection,
  size: MapSize
): StructureGeometry {
  const byId = new Map(structure.nodes.map(node => [node.id, node]));
  const scales = radiusScales(projection, size);
  const tangents = nodeTangents(structure);
  const degrees = nodeDegrees(structure);
  const chains = structureChains(structure).map(chain =>
    chainGeometry(structure, chain, projection, size, scales, byId)
  );

  const nodes = structure.nodes.map(node => ({
    point: projectPoint(projection, size, node.position),
    tangent: tangents.get(node.id) ?? 0,
    radii: scaleRadii(node.radius, scales),
    branch: (degrees.get(node.id) ?? 0) >= 3,
  }));

  return { chains, nodes };
}

/**
 * Normalized world coordinates put cell centres at 0 and 1, so the same
 * mapping the generator uses places geometry exactly on the raster.
 */
export function projectPoint(
  projection: MapProjection,
  size: MapSize,
  point: WorldPoint
): CanvasPoint {
  return {
    x: projection.left + (point.x * (size.width - 1) + 0.5) * projection.cellSize,
    y: projection.top + (point.y * (size.height - 1) + 0.5) * projection.cellSize,
  };
}

function paintOcean(
  context: CanvasRenderingContext2D,
  projection: MapProjection,
  scene: LandmassScene
): void {
  if (!scene.shape) {
    return;
  }
  context.beginPath();
  traceWorldBoundary(context, projection, scene.size, scene.shape);
  context.fillStyle = OCEAN_COLOR;
  context.fill();
}

function chainGeometry(
  structure: GeologicalStructure,
  chain: StructureChain,
  projection: MapProjection,
  size: MapSize,
  scales: CanvasRadii,
  byId: ReadonlyMap<string, LandmassNode>
): ChainGeometry {
  const axis = chainAxis(structure, chain, byId);
  const points = axis.points.map(point => projectPoint(projection, size, point));
  const radii = axis.radii.map(radius => scaleRadii(radius, scales));
  return {
    points,
    runs: corridorRuns(points, radii, chain.closed, [...axis.nodeIndexes.values()]),
  };
}

/** Axis of one chain: node positions and control points in travel order. */
function chainAxis(
  structure: GeologicalStructure,
  chain: StructureChain,
  byId: ReadonlyMap<string, LandmassNode>
): { points: WorldPoint[]; radii: number[]; nodeIndexes: ReadonlyMap<string, number> } {
  const points: WorldPoint[] = [];
  const radii: number[] = [];
  const nodeIndexes = new Map<string, number>();

  for (let index = 0; index < chain.path.length - 1; index++) {
    const from = byId.get(chain.path[index]);
    const to = byId.get(chain.path[index + 1]);
    if (!from || !to) {
      continue;
    }
    const edge = structure.edges.find(
      candidate =>
        (candidate.from === from.id && candidate.to === to.id) ||
        (candidate.from === to.id && candidate.to === from.id)
    );
    const controls = edge?.controlPoints ?? [];
    const ordered = edge?.from === from.id ? controls : [...controls].reverse();
    const segment = [from.position, ...ordered, to.position];
    const segmentRadii = interpolatedRadii(segment, from.radius, to.radius);
    if (index === 0) {
      nodeIndexes.set(from.id, points.length);
    }
    points.push(...(index === 0 ? segment : segment.slice(1)));
    radii.push(...(index === 0 ? segmentRadii : segmentRadii.slice(1)));
    if (!nodeIndexes.has(to.id)) {
      nodeIndexes.set(to.id, points.length - 1);
    }
  }
  return { points, radii, nodeIndexes };
}

/** One chain produces one uninterrupted ribbon, never isolated filled panels. */
function corridorRuns(
  points: readonly CanvasPoint[],
  radii: readonly CanvasRadii[],
  closed: boolean,
  nodeIndexes: readonly number[]
): readonly CorridorRun[] {
  return points.length >= 2 ? [corridorRun(points, radii, closed, nodeIndexes)] : [];
}

function corridorRun(
  points: readonly CanvasPoint[],
  radii: readonly CanvasRadii[],
  closed: boolean,
  nodeIndexes: readonly number[]
): CorridorRun {
  return {
    points,
    radii,
    left: sideRail(points, radii, -1, closed),
    right: sideRail(points, radii, 1, closed),
    closed,
    nodeIndexes,
  };
}

/**
 * The drawing is a construction plan, not an outline: the axis carries the
 * structure, width strokes mark the local width at the nodes, and a valid
 * corridor stays a very light hint behind them.
 */
function paintStructure(
  context: CanvasRenderingContext2D,
  projection: MapProjection,
  size: MapSize,
  structure: GeologicalStructure,
  color: Color
): void {
  const geometry = structureGeometry(structure, projection, size);
  const cellSize = projection.cellSize;
  const railWidth = Math.max(MIN_RAIL_PX, cellSize * RAIL_WEIGHT);
  const widthStroke = Math.max(MIN_WIDTH_STROKE_PX, cellSize * WIDTH_STROKE_WEIGHT);
  const skeletonWidth = Math.max(MIN_SKELETON_PX, cellSize * SKELETON_WEIGHT);
  const nodeRadius = Math.max(MIN_NODE_PX, cellSize * NODE_WEIGHT);

  context.lineJoin = 'round';
  context.lineCap = 'round';

  // Very light corridor and its rails; neither may compete with the axis.
  for (const chain of geometry.chains) {
    for (const run of chain.runs) {
      paintCorridor(context, run, color);
    }
  }
  context.strokeStyle = rgba(color, RAIL_ALPHA);
  context.lineWidth = railWidth;
  for (const chain of geometry.chains) {
    for (const run of chain.runs) {
      paintCurve(context, run.left, run.closed);
      paintCurve(context, run.right, run.closed);
    }
  }

  // Subtle extra ribs sample the width between real nodes; the body curve
  // interpolates their ends (docs/landmass-layout-body-preview.md).
  context.strokeStyle = rgba(color, WIDTH_STROKE_ALPHA * 0.45);
  context.lineWidth = Math.max(MIN_RAIL_PX, widthStroke * 0.7);
  for (const chain of geometry.chains) {
    for (const run of chain.runs) {
      paintAuxiliaryRibs(context, run);
    }
  }

  // One prominent width stroke per real node, perpendicular to the local direction.
  context.strokeStyle = rgba(color, WIDTH_STROKE_ALPHA);
  context.lineWidth = widthStroke;
  for (const node of geometry.nodes) {
    const left = offsetPoint(node.point, node.tangent, node.radii, -1);
    const right = offsetPoint(node.point, node.tangent, node.radii, 1);
    context.beginPath();
    context.moveTo(left.x, left.y);
    context.lineTo(right.x, right.y);
    context.stroke();
  }

  // Axis above everything; the dark halo keeps the thin line readable.
  context.strokeStyle = HALO_COLOR;
  context.lineWidth = skeletonWidth + HALO_EXTRA_PX;
  for (const chain of geometry.chains) {
    paintPolyline(context, chain.points);
  }
  context.strokeStyle = rgb(color);
  context.lineWidth = skeletonWidth;
  for (const chain of geometry.chains) {
    paintPolyline(context, chain.points);
  }

  // Only real nodes become dots; control points just shape the axis.
  context.fillStyle = rgb(color);
  for (const node of geometry.nodes) {
    paintDot(context, node.point, node.branch ? nodeRadius * BRANCH_SCALE : nodeRadius);
  }
}

/**
 * Fills the single outline of the body: the smooth rails through rib ends and
 * the ribs at the open tips (or the ring seam). No second geometry besides that
 * path — body is only colouring of the curve (docs/landmass-layout-body-preview.md).
 */
function paintCorridor(context: CanvasRenderingContext2D, run: CorridorRun, color: Color): void {
  const left = run.closed ? uniqueLoop(run.left) : run.left;
  const right = run.closed ? uniqueLoop(run.right) : run.right;
  if (left.length < 2 || right.length < 2) {
    return;
  }
  context.fillStyle = rgba(color, FILL_ALPHA);
  context.beginPath();
  if (run.closed) {
    traceSmoothPolyline(context, left, true);
    traceSmoothPolyline(context, right, true);
    context.fill('evenodd');
    return;
  }
  traceSmoothPolyline(context, left, false);
  context.lineTo(right[right.length - 1].x, right[right.length - 1].y);
  traceSmoothPolyline(context, [...right].reverse(), false, true);
  context.closePath();
  addEndCap(context, run.points[0], run.radii[0]);
  addEndCap(context, run.points[run.points.length - 1], run.radii[run.radii.length - 1]);
  context.fill();
}

function addEndCap(
  context: CanvasRenderingContext2D,
  point: CanvasPoint | undefined,
  radius: CanvasRadii | undefined
): void {
  if (!point || !radius) {
    return;
  }
  context.moveTo(point.x + radius.x, point.y);
  context.ellipse(point.x, point.y, radius.x, radius.y, 0, 0, TAU);
}

function paintPolyline(context: CanvasRenderingContext2D, points: readonly CanvasPoint[]): void {
  context.beginPath();
  tracePolyline(context, points);
  context.stroke();
}

function paintCurve(
  context: CanvasRenderingContext2D,
  points: readonly CanvasPoint[],
  closed: boolean
): void {
  context.beginPath();
  traceSmoothPolyline(context, points, closed);
  if (closed) {
    context.closePath();
  }
  context.stroke();
}

function tracePolyline(context: CanvasRenderingContext2D, points: readonly CanvasPoint[]): void {
  if (points.length === 0) {
    return;
  }
  context.moveTo(points[0].x, points[0].y);
  for (let index = 1; index < points.length; index++) {
    context.lineTo(points[index].x, points[index].y);
  }
}

function uniqueLoop(points: readonly CanvasPoint[]): CanvasPoint[] {
  if (points.length >= 2 && samePoint(points[0], points[points.length - 1])) {
    return points.slice(0, -1);
  }
  return [...points];
}

/**
 * Centripetal Catmull–Rom through the points as cubic Bézier. Bounded handles
 * prevent uneven samples from producing loops beyond neighbouring ribs.
 */
function traceSmoothPolyline(
  context: CanvasRenderingContext2D,
  points: readonly CanvasPoint[],
  closed: boolean,
  continuePath = false
): void {
  const pts = closed ? uniqueLoop(points) : points;
  if (pts.length === 0) {
    return;
  }
  if (!continuePath) {
    context.moveTo(pts[0].x, pts[0].y);
  }
  if (pts.length === 1) {
    return;
  }
  if (pts.length === 2) {
    context.lineTo(pts[1].x, pts[1].y);
    if (closed) {
      context.lineTo(pts[0].x, pts[0].y);
    }
    return;
  }

  const count = closed ? pts.length : pts.length - 1;
  for (let index = 0; index < count; index++) {
    const p0 = splinePoint(pts, index - 1, closed);
    const p1 = splinePoint(pts, index, closed);
    const p2 = splinePoint(pts, index + 1, closed);
    const p3 = splinePoint(pts, index + 2, closed);
    const intervalBefore = Math.sqrt(distance(p0, p1));
    const interval = Math.sqrt(distance(p1, p2));
    const intervalAfter = Math.sqrt(distance(p2, p3));
    const firstDivisor = 3 * (intervalBefore + interval);
    const secondDivisor = 3 * (interval + intervalAfter);
    const firstScale = firstDivisor > STRAIGHT_ENOUGH ? interval / firstDivisor : 0;
    const secondScale = secondDivisor > STRAIGHT_ENOUGH ? interval / secondDivisor : 0;
    const chord = distance(p1, p2);
    const firstControl = limitedControlPoint(
      p1,
      {
        x: p1.x + (p2.x - p0.x) * firstScale,
        y: p1.y + (p2.y - p0.y) * firstScale,
      },
      chord * SPLINE_HANDLE_LIMIT
    );
    const secondControl = limitedControlPoint(
      p2,
      {
        x: p2.x - (p3.x - p1.x) * secondScale,
        y: p2.y - (p3.y - p1.y) * secondScale,
      },
      chord * SPLINE_HANDLE_LIMIT
    );
    context.bezierCurveTo(
      firstControl.x,
      firstControl.y,
      secondControl.x,
      secondControl.y,
      p2.x,
      p2.y
    );
  }
}

function limitedControlPoint(
  anchor: CanvasPoint,
  control: CanvasPoint,
  limit: number
): CanvasPoint {
  const length = distance(anchor, control);
  if (length <= limit || length < STRAIGHT_ENOUGH) {
    return control;
  }
  const scale = limit / length;
  return {
    x: anchor.x + (control.x - anchor.x) * scale,
    y: anchor.y + (control.y - anchor.y) * scale,
  };
}

function splinePoint(points: readonly CanvasPoint[], index: number, closed: boolean): CanvasPoint {
  const last = points.length - 1;
  if (closed) {
    return points[(index + points.length) % points.length];
  }
  if (index < 0) {
    return points[0];
  }
  if (index > last) {
    return points[last];
  }
  return points[index];
}

function samePoint(left: CanvasPoint, right: CanvasPoint): boolean {
  return left.x === right.x && left.y === right.y;
}

function distance(left: CanvasPoint, right: CanvasPoint): number {
  return Math.hypot(right.x - left.x, right.y - left.y);
}

function paintAuxiliaryRibs(context: CanvasRenderingContext2D, run: CorridorRun): void {
  for (const index of extraRibIndexes(run)) {
    const from = run.left[index];
    const to = run.right[index];
    if (!from || !to) {
      continue;
    }
    context.beginPath();
    context.moveTo(from.x, from.y);
    context.lineTo(to.x, to.y);
    context.stroke();
  }
}

/**
 * Indexes of helper ribs: exactly one between every pair of consecutive real
 * nodes, halfway along the axis, so the ribs read as a regular ladder. Closed
 * spans include the seam from the last node back to the repeated first point.
 */
export function extraRibIndexes(run: CorridorRun): readonly number[] {
  const stops = [...new Set(run.nodeIndexes)].sort((left, right) => left - right);
  if (stops.length < 2 || run.points.length < 3) {
    return [];
  }
  if (run.closed && stops[0] === 0 && stops[stops.length - 1] < run.points.length - 1) {
    stops.push(run.points.length - 1);
  }
  const extras: number[] = [];
  for (let span = 0; span < stops.length - 1; span++) {
    const index = midpointIndex(run.points, stops[span], stops[span + 1]);
    if (index > stops[span] && index < stops[span + 1]) {
      extras.push(index);
    }
  }
  return extras;
}

/** Index of the axis point closest to half the arc length between two indexes. */
function midpointIndex(points: readonly CanvasPoint[], from: number, to: number): number {
  let total = 0;
  const lengths: number[] = [];
  for (let index = from + 1; index <= to; index++) {
    total += distance(points[index - 1], points[index]);
    lengths.push(total);
  }
  const half = total / 2;
  for (let index = 0; index < lengths.length; index++) {
    if (lengths[index] >= half) {
      return from + 1 + index;
    }
  }
  return to;
}

/** Tangents of a closed chain use neighbours through its repeated seam point. */
function closedPointTangents(points: readonly CanvasPoint[]): readonly number[] {
  const unique = points.length - 1;
  if (unique < 2) {
    return pointTangents(points);
  }
  return points.map((_, index) => {
    const current = index % unique;
    const previous = points[(current - 1 + unique) % unique];
    const next = points[(current + 1) % unique];
    return Math.atan2(next.y - previous.y, next.x - previous.x);
  });
}

function paintDot(context: CanvasRenderingContext2D, point: CanvasPoint, radius: number): void {
  context.beginPath();
  context.arc(point.x, point.y, radius, 0, TAU);
  context.fill();
}

/** Point at the influence radius on one side of a local direction. */
function offsetPoint(
  point: CanvasPoint,
  tangent: number,
  radii: CanvasRadii,
  side: -1 | 1
): CanvasPoint {
  const normal = tangent + (side * Math.PI) / 2;
  const normalX = Math.cos(normal);
  const normalY = Math.sin(normal);
  const support = Math.hypot(radii.x * normalX, radii.y * normalY);
  if (support < STRAIGHT_ENOUGH) {
    return point;
  }
  return {
    x: point.x + (radii.x ** 2 * normalX) / support,
    y: point.y + (radii.y ** 2 * normalY) / support,
  };
}

/** Direction of the edge polyline leaving its first or last point. */
function leavingDirection(points: readonly WorldPoint[], fromStart: boolean): number {
  if (points.length < 2) {
    return 0;
  }
  const node = fromStart ? points[0] : points[points.length - 1];
  const next = fromStart ? points[1] : points[points.length - 2];
  return Math.atan2(next.y - node.y, next.x - node.x);
}

function scaleRadii(radius: number, scales: CanvasRadii): CanvasRadii {
  return { x: radius * scales.x, y: radius * scales.y };
}

function radiusScales(projection: MapProjection, size: MapSize): CanvasRadii {
  return {
    x: (size.width - 1) * projection.cellSize,
    y: (size.height - 1) * projection.cellSize,
  };
}

function structureColor(index: number): Color {
  return STRUCTURE_COLORS[index % STRUCTURE_COLORS.length];
}

function rgb(color: Color): string {
  return `rgb(${color[0]}, ${color[1]}, ${color[2]})`;
}

function rgba(color: Color, alpha: number): string {
  return `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${alpha})`;
}

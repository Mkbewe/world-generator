import type {
  HeatZoneConfig,
  HeatZoneGeometry,
  WorldPoint,
} from '../../../../utils/map-generator/types';

/** How the heat zones are laid out; the config itself stores geometry per zone. */
export type HeatZoneLayout = 'horizontal' | 'vertical' | 'rings';

/** Smallest share of the bar one zone may keep, in percent. */
export const MIN_HEAT_ZONE_SHARE = 1;
/** Radius of the visible disc; rings created from bands cover this extent. */
export const DEFAULT_RING_EXTENT = 0.5;

const WORLD_CENTRE: WorldPoint = { x: 0.5, y: 0.5 };

export function layoutOfZones(zones: readonly HeatZoneConfig[]): HeatZoneLayout {
  const geometry = zones[0]?.geometry;
  if (!geometry) {
    return 'horizontal';
  }
  if (geometry.kind === 'ring') {
    return 'rings';
  }
  return geometry.axis === 'x' ? 'vertical' : 'horizontal';
}

/** Outer radius of the ring layout; bands ignore it. */
export function ringExtentOf(zones: readonly HeatZoneConfig[]): number {
  let extent = 0;
  for (const zone of zones) {
    if (zone.geometry.kind === 'ring') {
      extent = Math.max(extent, zone.geometry.outerRadius);
    }
  }
  return extent > 0 ? extent : DEFAULT_RING_EXTENT;
}

/** Cumulative boundaries of the zones, in percent of the layout extent. */
export function zoneBoundaries(
  zones: readonly HeatZoneConfig[],
  layout: HeatZoneLayout,
  ringExtent: number
): number[] {
  const total = layoutExtent(layout, ringExtent);
  const boundaries: number[] = [];
  let cumulative = 0;
  for (const zone of zones.slice(0, -1)) {
    const { start, end } = intervalOf(zone.geometry);
    cumulative += end - start;
    boundaries.push((cumulative / total) * 100);
  }
  return boundaries;
}

/** Thickness of every zone, in percent of the layout extent. */
export function zoneShares(
  zones: readonly HeatZoneConfig[],
  layout: HeatZoneLayout,
  ringExtent: number
): number[] {
  const total = layoutExtent(layout, ringExtent);
  return zones.map(zone => {
    const { start, end } = intervalOf(zone.geometry);
    return ((end - start) / total) * 100;
  });
}

/** Segments of the distribution bar, one per zone. */
export function zoneSegments(
  zones: readonly HeatZoneConfig[],
  layout: HeatZoneLayout,
  ringExtent: number
): readonly { id: string; percent: number }[] {
  const shares = zoneShares(zones, layout, ringExtent);
  return zones.map((zone, index) => ({ id: zone.id, percent: shares[index] ?? 0 }));
}

/** Rebuilds every zone geometry from cumulative boundaries in percent. */
export function zonesFromBoundaries(
  zones: readonly HeatZoneConfig[],
  layout: HeatZoneLayout,
  ringExtent: number,
  boundaries: readonly number[]
): HeatZoneConfig[] {
  const points = [0, ...boundaries, 100];
  const total = layoutExtent(layout, ringExtent);
  return zones.map((zone, index) => {
    const start = ((points[index] ?? 0) / 100) * total;
    const end = ((points[index + 1] ?? 100) / 100) * total;
    return { ...zone, geometry: geometryFor(zone.geometry, layout, start, end) };
  });
}

/** Keeps every boundary between its neighbours while leaving at least the minimum share. */
export function clampZoneBoundaries(boundaries: readonly number[], count: number): number[] {
  let previous = 0;
  return boundaries.map((boundary, index) => {
    const remaining = count - index - 1;
    const normalized = Math.min(
      100 - remaining * MIN_HEAT_ZONE_SHARE,
      Math.max(previous + MIN_HEAT_ZONE_SHARE, boundary)
    );
    previous = normalized;
    return normalized;
  });
}

/** Splits the widest zone in half and inserts the new zone after it. */
export function splitLargestZone(
  zones: readonly HeatZoneConfig[],
  layout: HeatZoneLayout,
  ringExtent: number,
  zone: HeatZoneConfig
): HeatZoneConfig[] {
  if (zones.length === 0) {
    return [zone];
  }
  const boundaries = zoneBoundaries(zones, layout, ringExtent);
  const points = [0, ...boundaries, 100];
  let largest = 0;
  let largestShare = -1;
  for (let index = 0; index < zones.length; index++) {
    const share = (points[index + 1] ?? 100) - (points[index] ?? 0);
    if (share > largestShare) {
      largestShare = share;
      largest = index;
    }
  }
  const start = points[largest] ?? 0;
  const end = points[largest + 1] ?? 100;
  const splitZone = zones[largest];
  const inserted = splitZone ? { ...zone, thermal: splitZone.thermal } : zone;
  const nextBoundaries = [...boundaries];
  nextBoundaries.splice(largest, 0, (start + end) / 2);
  const nextZones = [...zones];
  nextZones.splice(largest + 1, 0, inserted);
  return zonesFromBoundaries(nextZones, layout, ringExtent, nextBoundaries);
}

/** Removes a zone and gives its share to the previous one (or the next one for the first). */
export function removeZoneFrom(
  zones: readonly HeatZoneConfig[],
  layout: HeatZoneLayout,
  ringExtent: number,
  id: string
): readonly HeatZoneConfig[] {
  const index = zones.findIndex(zone => zone.id === id);
  if (index < 0 || zones.length <= 1) {
    return zones;
  }
  const boundaries = zoneBoundaries(zones, layout, ringExtent);
  const removedBoundary = Math.max(0, index - 1);
  const nextBoundaries = boundaries.filter((_, boundaryIndex) => boundaryIndex !== removedBoundary);
  const nextZones = zones.filter(zone => zone.id !== id);
  return zonesFromBoundaries(nextZones, layout, ringExtent, nextBoundaries);
}

/** Moves a zone one slot earlier or later; the slots keep their extents. */
export function moveZoneIn(
  zones: readonly HeatZoneConfig[],
  layout: HeatZoneLayout,
  ringExtent: number,
  id: string,
  direction: -1 | 1
): readonly HeatZoneConfig[] {
  const index = zones.findIndex(zone => zone.id === id);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= zones.length) {
    return zones;
  }
  const boundaries = zoneBoundaries(zones, layout, ringExtent);
  const next = [...zones];
  const current = next[index];
  const other = next[target];
  if (!current || !other) {
    return zones;
  }
  next[index] = other;
  next[target] = current;
  return zonesFromBoundaries(next, layout, ringExtent, boundaries);
}

/** Converts all zones to another layout family while keeping their relative shares. */
export function convertLayout(
  zones: readonly HeatZoneConfig[],
  from: HeatZoneLayout,
  to: HeatZoneLayout,
  ringExtent: number
): HeatZoneConfig[] {
  if (from === to) {
    return [...zones];
  }
  const boundaries = zoneBoundaries(zones, from, ringExtent);
  return zonesFromBoundaries(zones, to, ringExtent, boundaries);
}

function layoutExtent(layout: HeatZoneLayout, ringExtent: number): number {
  return layout === 'rings' ? Math.max(ringExtent, DEFAULT_RING_EXTENT) : 1;
}

function intervalOf(geometry: HeatZoneGeometry): { start: number; end: number } {
  if (geometry.kind === 'ring') {
    return { start: geometry.innerRadius, end: geometry.outerRadius };
  }
  return { start: geometry.center - geometry.width / 2, end: geometry.center + geometry.width / 2 };
}

function geometryFor(
  previous: HeatZoneGeometry,
  layout: HeatZoneLayout,
  start: number,
  end: number
): HeatZoneGeometry {
  if (layout === 'rings') {
    const center = previous.kind === 'ring' ? previous.center : WORLD_CENTRE;
    return { kind: 'ring', center: { ...center }, innerRadius: start, outerRadius: end };
  }
  const axis = layout === 'vertical' ? 'x' : 'y';
  return { kind: 'band', axis, center: (start + end) / 2, width: end - start };
}

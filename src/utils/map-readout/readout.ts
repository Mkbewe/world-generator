import { isLandmassLayout, structureSegments } from '../map-generator/stages/landmass';
import type { GeologicalStructure } from '../map-generator/types';
import type { MapInfo, MapInspection } from '../map-renderer';
import { cellOriginMeters, type WorldDimensions } from '../world-dimensions';

export interface PointerSample {
  /** Source raster cell under the pointer. */
  readonly x: number;
  readonly y: number;
  /** Normalized position within the source map, in the 0..1 range. */
  readonly u: number;
  readonly v: number;
}

export interface InspectorReadout {
  readonly position: PointerSample;
  readonly inspection?: MapInspection;
}

/** Labelled pair of X/Y values rendered as aligned columns. */
export interface ReadoutLine {
  readonly label: string;
  readonly x: string;
  readonly y: string;
}

export interface ReadoutItem {
  readonly id: string;
  readonly label: string;
  readonly value: string;
  /** When present, rendered as aligned X/Y columns instead of a single value. */
  readonly lines?: readonly ReadoutLine[];
}

const EMPTY = '—';

export function readoutItems(
  readout: InspectorReadout | undefined,
  info: MapInfo = {}
): readonly ReadoutItem[] {
  const inspection = readout?.inspection;
  const structure = inspection ? landmassStructure(inspection, info) : undefined;
  return [
    {
      id: 'position',
      label: 'Position',
      value: EMPTY,
      lines: readout ? describePositionLines(readout.position, info) : undefined,
    },
    ...inspectionItems(inspection, info, structure),
  ];
}

/** Raster layers report their value; vector layers name the hovered element. */
function inspectionItems(
  inspection: MapInspection | undefined,
  info: MapInfo,
  structure: GeologicalStructure | undefined
): readonly ReadoutItem[] {
  if (inspection?.kind === 'vector') {
    return [
      { id: 'name', label: 'Name', value: inspection.hit?.id ?? EMPTY },
      ...(structure ? [{ id: 'archetype', label: 'Archetype', value: structure.archetype }] : []),
      ...structureItems(structure, info),
    ];
  }
  return [
    {
      id: 'value',
      label: inspection?.label ?? 'Value',
      value: describeValue(inspection, info),
    },
  ];
}

/** Pixel coordinates with the cell origin in meters when dimensions are known. */
function describePositionLines(position: PointerSample, info: MapInfo): readonly ReadoutLine[] {
  const lines: ReadoutLine[] = [
    { label: 'Position', x: `X ${position.x} cell`, y: `Y ${position.y} cell` },
  ];
  const dimensions = worldDimensions(info);
  if (dimensions) {
    const meters = cellOriginMeters(dimensions, position.x, position.y);
    lines.push({
      label: 'Distance',
      x: `X ${formatMeters(meters.xMeters)} m`,
      y: `Y ${formatMeters(meters.yMeters)} m`,
    });
  }
  return lines;
}

function describeValue(inspection: MapInspection | undefined, info: MapInfo): string {
  if (!inspection || inspection.kind === 'vector') {
    return EMPTY;
  }
  if (inspection.value === undefined) {
    return EMPTY;
  }
  switch (inspection.layerId) {
    case 'world-shape':
      return inspection.value === 1 ? 'Inside' : 'Outside';
    case 'macro-region': {
      const label = labelAt(info, 'macroRegionLabels', inspection.value);
      return label ?? `Region ${inspection.value}`;
    }
    default:
      return inspection.value.toFixed(3);
  }
}

/** Structure a vector hit points at, when the map carries the generated layout. */
function landmassStructure(
  inspection: MapInspection,
  info: MapInfo
): GeologicalStructure | undefined {
  if (inspection.kind !== 'vector' || !inspection.hit) {
    return undefined;
  }
  const id = inspection.hit.id;
  const layout: unknown = info.landmassLayout;
  if (!isLandmassLayout(layout)) {
    return undefined;
  }
  return layout.structures.find(structure => structure.id === id);
}

/** Measurements of the hovered structure, shown as extra readout rows. */
function structureItems(
  structure: GeologicalStructure | undefined,
  info: MapInfo
): readonly ReadoutItem[] {
  if (!structure) {
    return [];
  }
  const metrics = structureMetrics(structure, worldDimensions(info));
  return [
    { id: 'nodes', label: 'Nodes', value: String(metrics.nodes) },
    { id: 'length', label: 'Length', value: metrics.length },
    { id: 'width', label: 'Width', value: metrics.width },
  ];
}

interface StructureMetrics {
  readonly nodes: number;
  readonly length: string;
  readonly width: string;
}

function structureMetrics(
  structure: GeologicalStructure,
  dimensions: WorldDimensions | undefined
): StructureMetrics {
  let length = 0;
  for (const segment of structureSegments(structure)) {
    const dx = segment.to.x - segment.from.x;
    const dy = segment.to.y - segment.from.y;
    length += dimensions
      ? Math.hypot(dx * dimensions.widthMeters, dy * dimensions.heightMeters)
      : Math.hypot(dx, dy);
  }
  const meanScale = dimensions ? (dimensions.widthMeters + dimensions.heightMeters) / 2 : 1;
  const widths = structure.nodes.map(node => node.radius * 2 * meanScale);
  const format = (value: number): string =>
    dimensions ? `${formatMeters(Math.round(value * 10) / 10)} m` : value.toFixed(3);
  return {
    nodes: structure.nodes.length,
    length: format(length),
    width: `${format(Math.min(...widths))}–${format(Math.max(...widths))}`,
  };
}

/** Reads the label captured with the generated map at the given label index. */
function labelAt(info: MapInfo, source: string, index: number): string | undefined {
  const labels = info[source];
  if (!Array.isArray(labels)) {
    return undefined;
  }
  const label: unknown = labels[index];
  return typeof label === 'string' && label.trim().length > 0 ? label : undefined;
}

/** Reads the world dimensions captured with the generated map, if they are well formed. */
function worldDimensions(info: MapInfo): WorldDimensions | undefined {
  const value: unknown = info.worldDimensions;
  if (!value || typeof value !== 'object') {
    return undefined;
  }
  const { widthMeters, heightMeters, sampleWidth, sampleHeight } = value as WorldDimensions;
  const numbers = [widthMeters, heightMeters, sampleWidth, sampleHeight];
  if (!numbers.every(entry => typeof entry === 'number' && Number.isFinite(entry))) {
    return undefined;
  }
  if (widthMeters <= 0 || heightMeters <= 0 || sampleWidth < 1 || sampleHeight < 1) {
    return undefined;
  }
  return { widthMeters, heightMeters, sampleWidth, sampleHeight };
}

function formatMeters(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

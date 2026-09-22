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
  return [
    {
      id: 'position',
      label: 'Position',
      value: EMPTY,
      lines: readout ? describePositionLines(readout.position, info) : undefined,
    },
    {
      id: 'value',
      label: readout?.inspection?.label ?? 'Value',
      value: describeValue(readout?.inspection, info),
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
  if (!inspection || inspection.value === undefined) {
    return EMPTY;
  }
  switch (inspection.id) {
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

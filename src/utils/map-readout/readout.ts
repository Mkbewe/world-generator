import { formatArea } from '../format';
import type { GeologicalRegionPlan } from '../map-generator/types';
import { regionStyle } from '../map-layers';
import type { MapBaseLayerId, MapInfo, MapInspection, VectorMapInspection } from '../map-renderer';
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

/** Interactive entry rendered as a button instead of a label/value pair. */
export interface ReadoutAction {
  readonly id: string;
  readonly label: string;
}

export interface ReadoutItem {
  readonly id: string;
  readonly label: string;
  readonly value: string;
  /** When present, rendered as aligned X/Y columns instead of a single value. */
  readonly lines?: readonly ReadoutLine[];
  /** When present, rendered as a button. */
  readonly action?: ReadoutAction;
}

const EMPTY = '—';

export function readoutItems(
  readout: InspectorReadout | undefined,
  info: MapInfo = {}
): readonly ReadoutItem[] {
  const inspection = readout?.inspection;
  return [
    {
      id: 'position',
      label: 'Position',
      value: EMPTY,
      lines: readout ? describePositionLines(readout.position, info) : undefined,
    },
    ...inspectionItems(inspection, info),
  ];
}

/** Readout of one vector element; undefined when the hit is unknown. */
type VectorReadout = (
  inspection: VectorMapInspection,
  info: MapInfo
) => readonly ReadoutItem[] | undefined;

/** One provider per vector layer; a new layer adds an entry, not a branch. */
const VECTOR_READOUTS: Partial<Record<MapBaseLayerId, VectorReadout>> = {
  geology: geologyReadout,
};

/** Raster layers report their value; vector layers name the hovered element. */
function inspectionItems(
  inspection: MapInspection | undefined,
  info: MapInfo
): readonly ReadoutItem[] {
  if (inspection?.kind === 'vector') {
    const provider = VECTOR_READOUTS[inspection.layerId];
    if (provider) {
      return provider(inspection, info) ?? [];
    }
    return [{ id: 'name', label: 'Name', value: inspection.hit?.id ?? EMPTY }];
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

/** Readout of the geological region under the pointer. */
function geologyReadout(
  inspection: VectorMapInspection,
  info: MapInfo
): readonly ReadoutItem[] | undefined {
  if (!inspection.hit) {
    return undefined;
  }
  const plan: unknown = info.geologyPlan;
  if (!hasRegionList(plan)) {
    return undefined;
  }
  const region = plan.regions.find(candidate => candidate.id === inspection.hit?.id);
  if (!region) {
    return undefined;
  }
  const style = regionStyle(region.type);
  return [
    { id: 'region', label: 'Region', value: region.id },
    { id: 'type', label: 'Type', value: style.label },
    { id: 'character', label: 'Character', value: style.description },
    ...areaItems(region, plan.worldAreaSquareMeters),
    {
      id: 'edit-region',
      label: 'Edit region',
      value: '',
      action: { id: 'edit-region', label: 'Edit region' },
    },
  ];
}

/** Rasterized area of the region and its share of the world, when measured. */
function areaItems(region: GeologicalRegionPlan, worldArea: unknown): readonly ReadoutItem[] {
  if (typeof region.areaSquareMeters !== 'number' || !Number.isFinite(region.areaSquareMeters)) {
    return [];
  }
  const share =
    typeof worldArea === 'number' && Number.isFinite(worldArea) && worldArea > 0
      ? ` · ${((region.areaSquareMeters / worldArea) * 100).toFixed(1)}%`
      : '';
  return [
    {
      id: 'area',
      label: 'Area',
      value: `${formatArea(region.areaSquareMeters)}${share}`,
    },
  ];
}

/**
 * Reads the region list without re-validating the whole raster: the plan was
 * checked when it entered the map info, and the readout runs on every pointer
 * move. Only the shape this readout consumes is checked here.
 */
function hasRegionList(value: unknown): value is {
  readonly regions: readonly GeologicalRegionPlan[];
  readonly worldAreaSquareMeters?: unknown;
} {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  return Array.isArray((value as { readonly regions?: unknown }).regions);
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

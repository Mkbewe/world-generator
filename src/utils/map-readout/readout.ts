import { formatArea, formatMeasure } from '../format';
import type { MacroRegionInfo } from '../map-generator/info-definitions';
import type { GeologicalRegionPlan } from '../map-generator/types';
import { regionStyle } from '../map-layers';
import type {
  MapBaseLayerId,
  MapInfo,
  MapInspection,
  RasterMapInspection,
  VectorMapInspection,
} from '../map-renderer';
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

/** Share names of the macro region form; the readout keeps its own short pair. */
const WIDTH_LABELS = { ring: 'Ring thickness', band: 'Band width' } as const;

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

/** Readout of one raster element; undefined falls back to the plain value item. */
type RasterReadout = (
  inspection: RasterMapInspection,
  info: MapInfo
) => readonly ReadoutItem[] | undefined;

/** One provider per vector layer; a new layer adds an entry, not a branch. */
const VECTOR_READOUTS: Partial<Record<MapBaseLayerId, VectorReadout>> = {
  geology: geologyReadout,
};

/** One provider per raster layer; a new layer adds an entry, not a branch. */
const RASTER_READOUTS: Partial<Record<MapBaseLayerId, RasterReadout>> = {
  'macro-region': macroRegionReadout,
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
  if (inspection?.kind === 'raster') {
    const items = RASTER_READOUTS[inspection.layerId]?.(inspection, info);
    if (items) {
      return items;
    }
  }
  return [
    {
      id: 'value',
      label: inspection?.label ?? 'Value',
      value: describeValue(inspection),
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

function describeValue(inspection: MapInspection | undefined): string {
  if (!inspection || inspection.kind === 'vector') {
    return EMPTY;
  }
  if (inspection.value === undefined) {
    return EMPTY;
  }
  switch (inspection.layerId) {
    case 'world-shape':
      return inspection.value === 1 ? 'Inside' : 'Outside';
    case 'macro-region':
      return `Region ${inspection.value}`;
    default:
      return inspection.value.toFixed(3);
  }
}

/** Label, range, width, danger and area of the macro region under the pointer. */
function macroRegionReadout(
  inspection: RasterMapInspection,
  info: MapInfo
): readonly ReadoutItem[] | undefined {
  const index = inspection.value;
  if (index === undefined) {
    return undefined;
  }
  const region = macroRegionAt(info, index);
  if (!region) {
    return undefined;
  }
  const items: ReadoutItem[] = [
    { id: 'region', label: 'Region', value: region.label.trim() || `Region ${index}` },
    { id: 'range', label: 'Range', value: rangeText(region) },
    { id: 'width', label: WIDTH_LABELS[region.kind], value: widthText(region, info) },
    { id: 'danger', label: 'Danger', value: region.danger.toFixed(2) },
  ];
  const area = areaItem(info, index);
  if (area) {
    items.push(area);
  }
  return items;
}

/** Normalized range as percentages: of the radius for rings, of the axis for bands. */
function rangeText(region: MacroRegionInfo): string {
  const scale = region.kind === 'ring' ? 200 : 100;
  const unit = region.kind === 'ring' ? 'radius' : 'axis';
  return `${percent(region.range[0] * scale)}–${percent(region.range[1] * scale)}% of the ${unit}`;
}

/** Base regions share the layout; an overlay band reports its coverage of the axis. */
function widthText(region: MacroRegionInfo, info: MapInfo): string {
  const extent = region.range[1] - region.range[0];
  if (region.role === 'overlay') {
    return `${percent(extent * 100)}%`;
  }
  const baseExtent = baseRegionsExtent(info);
  return baseExtent > 0 ? `${percent((extent / baseExtent) * 100)}%` : EMPTY;
}

/** Ground area of the region and its share of the world, when measured. */
function areaItem(info: MapInfo, index: number): ReadoutItem | undefined {
  const areas = info.macroRegionAreas;
  if (!Array.isArray(areas)) {
    return undefined;
  }
  const area: unknown = areas[index];
  if (typeof area !== 'number' || !Number.isFinite(area)) {
    return undefined;
  }
  const total = areas.reduce(
    (sum, entry) => sum + (typeof entry === 'number' && Number.isFinite(entry) ? entry : 0),
    0
  );
  const share = total > 0 ? ` · ${((area / total) * 100).toFixed(1)}%` : '';
  return { id: 'area', label: 'Area', value: `${formatArea(area)}${share}` };
}

/** Sum of the base region extents, used as the denominator of their width share. */
function baseRegionsExtent(info: MapInfo): number {
  const list = info.macroRegionInfo;
  if (!Array.isArray(list)) {
    return 0;
  }
  let total = 0;
  for (const entry of list) {
    if (isMacroRegionInfo(entry) && entry.role === 'base') {
      total += entry.range[1] - entry.range[0];
    }
  }
  return total;
}

/** One macro region captured with the map, read without re-validating the whole list. */
function macroRegionAt(info: MapInfo, index: number): MacroRegionInfo | undefined {
  const list = info.macroRegionInfo;
  if (!Array.isArray(list)) {
    return undefined;
  }
  const entry: unknown = list[index];
  return isMacroRegionInfo(entry) ? entry : undefined;
}

function isMacroRegionInfo(value: unknown): value is MacroRegionInfo {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const { label, role, danger, kind, range } = value as Record<string, unknown>;
  return (
    typeof label === 'string' &&
    (role === 'base' || role === 'overlay') &&
    typeof danger === 'number' &&
    Number.isFinite(danger) &&
    (kind === 'ring' || kind === 'band') &&
    Array.isArray(range) &&
    range.length === 2 &&
    range.every(entry => typeof entry === 'number' && Number.isFinite(entry))
  );
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

/** Reads the world dimensions captured with the generated map, if they are well formed. */
export function worldDimensions(info: MapInfo): WorldDimensions | undefined {
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

/** Number with at most one decimal, e.g. "25" or "18.7". */
function percent(value: number): string {
  return formatMeasure(value, 1);
}

function formatMeters(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

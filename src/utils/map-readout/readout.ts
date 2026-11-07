import type { MessageKey } from '../../i18n';
import { formatArea, formatDistance, formatMeasure, formatPercent } from '../format';
import { isHeatZoneInfoList, type MacroRegionInfo } from '../map-generator/info-definitions';
import type { GeologicalRegionPlan } from '../map-generator/types';
import {
  type MapBaseLayerId,
  type MapInfo,
  type MapInspection,
  type MapOverlayInspection,
  OVERLAY_LAYERS,
  type RasterMapInspection,
  type VectorMapInspection,
} from '../map-renderer';
import { cellOriginMeters, type WorldDimensions } from '../world-dimensions';

export interface TranslatedText {
  readonly key: MessageKey;
  readonly params?: Readonly<Record<string, string | number | { readonly key: MessageKey }>>;
}

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
  readonly overlays?: readonly MapOverlayInspection[];
}

/** Ordered map points of a measurement; the preview is the next segment. */
export interface Measurement {
  readonly points: readonly PointerSample[];
  readonly preview?: PointerSample;
  /** True after the user finishes the path; pointer movement stops following. */
  readonly finished?: boolean;
}

/** Labelled pair of X/Y values rendered as aligned columns. */
export interface ReadoutLine {
  /** Column caption; omitted for a continuation of the line above. */
  readonly labelKey?: MessageKey;
  readonly x: string;
  readonly y: string;
}

/** Interactive entry rendered as a button instead of a label/value pair. */
export interface ReadoutAction {
  readonly id: string;
  readonly labelKey: MessageKey;
}

export interface ReadoutItem {
  readonly id: string;
  readonly labelKey: MessageKey;
  readonly value?: string | TranslatedText;
  /** When present, rendered as aligned X/Y columns instead of a single value. */
  readonly lines?: readonly ReadoutLine[];
  /** When present, rendered as a button. */
  readonly action?: ReadoutAction;
  /** When true, the entry ends its group and keeps a margin below it. */
  readonly separated?: boolean;
  /** When true, the entry starts a new group with a margin above it. */
  readonly detached?: boolean;
  /** When true, the entry is a small group heading without a value. */
  readonly heading?: boolean;
}

const DIRECTION_KEYS: readonly MessageKey[] = [
  'directions.east',
  'directions.southeast',
  'directions.south',
  'directions.southwest',
  'directions.west',
  'directions.northwest',
  'directions.north',
  'directions.northeast',
];

function oceanCurrentText(angle: number, strength: number): TranslatedText {
  if (strength < 0.01) {
    return { key: 'readout.calm' };
  }
  const turn = Math.round(angle / (Math.PI / 4)) % DIRECTION_KEYS.length;
  const directionKey = DIRECTION_KEYS[(turn + DIRECTION_KEYS.length) % DIRECTION_KEYS.length];
  if (directionKey === undefined) {
    throw new RangeError(`Ocean-current angle is out of range: ${angle}.`);
  }
  return {
    key: 'readout.oceanCurrentValue',
    params: { strength: Math.round(strength * 100), direction: { key: directionKey } },
  };
}

const EMPTY = '—';

export interface ReadoutOptions {
  /** When false, action buttons are dropped, e.g. in the fullscreen preview. */
  readonly actions?: boolean;
}

export function readoutItems(
  readout: InspectorReadout | undefined,
  info: MapInfo = {},
  measurement?: Measurement,
  options: ReadoutOptions = {}
): readonly ReadoutItem[] {
  const inspection = readout?.inspection;
  const measured = measurement ? measuredItem(measurement, info) : undefined;
  const overlays = readout?.overlays ?? [];
  const items: ReadoutItem[] = [
    {
      id: 'position',
      labelKey: 'readout.position',
      value: EMPTY,
      lines: readout ? describePositionLines(readout.position, info) : undefined,
      separated: measured === undefined,
    },
    ...(measured ? [measured] : []),
    ...inspectionItems(inspection, info),
    ...(overlays.length > 0
      ? ([
          {
            id: 'overlays',
            labelKey: 'readout.overlays',
            value: '',
            heading: true,
            detached: true,
          },
          ...overlays.map(overlay => {
            const labelKey = OVERLAY_LAYERS[overlay.overlayId].labelKey;
            return {
              id: `overlay-${overlay.overlayId}`,
              labelKey,
              value: overlay.oceanCurrent
                ? oceanCurrentText(overlay.oceanCurrent.angle, overlay.oceanCurrent.strength)
                : overlay.value,
            };
          }),
        ] satisfies readonly ReadoutItem[])
      : []),
  ];
  return options.actions === false ? items.filter(item => item.action === undefined) : items;
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
  'geology': geologyReadout,
  'ocean-currents': oceanCurrentReadout,
};

/** One provider per raster layer; a new layer adds an entry, not a branch. */
const RASTER_READOUTS: Partial<Record<MapBaseLayerId, RasterReadout>> = {
  'macro-region': macroRegionReadout,
  'heightmap': heightmapReadout,
  'heat-zones': heatZoneReadout,
  'moisture': moistureReadout,
};

/** Height under the pointer relative to the sea level; 0 is the waterline. */
function heightmapReadout(inspection: RasterMapInspection): readonly ReadoutItem[] | undefined {
  const height = inspection.value;
  if (height === undefined) {
    return undefined;
  }
  return [
    {
      id: 'surface',
      labelKey: 'readout.surface',
      value: { key: height > 0 ? 'readout.land' : 'readout.water' },
    },
    { id: 'height', labelKey: 'readout.height', value: `${formatMeters(height)} m` },
  ];
}

/** Name and thermal class of the heat zone under the pointer. */
function heatZoneReadout(
  inspection: RasterMapInspection,
  info: MapInfo
): readonly ReadoutItem[] | undefined {
  const index = inspection.value;
  if (index === undefined) {
    return undefined;
  }
  const zones = info.heatZoneInfo;
  if (!isHeatZoneInfoList(zones)) {
    return undefined;
  }
  const zone = zones[index];
  if (!zone) {
    return undefined;
  }
  return [
    { id: 'zone', labelKey: 'readout.heatZone', value: zone.label },
    { id: 'thermal', labelKey: 'readout.class', value: { key: `readout.${zone.thermal}` } },
  ];
}

/** Base moisture as a percentage of its 0..1 range. */
function moistureReadout(inspection: RasterMapInspection): readonly ReadoutItem[] | undefined {
  const value = inspection.value;
  if (value === undefined) {
    return undefined;
  }
  return [{ id: 'moisture', labelKey: 'readout.moisture', value: formatPercent(value) }];
}

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
    return [{ id: 'name', labelKey: 'readout.name', value: inspection.hit?.id ?? EMPTY }];
  }
  if (inspection?.kind === 'raster') {
    const items = RASTER_READOUTS[inspection.layerId]?.(inspection, info);
    if (items) {
      return items;
    }
  }
  return [{ id: 'value', labelKey: 'readout.value', ...describeValue(inspection) }];
}

/** Pixel coordinates with the cell origin in meters when dimensions are known. */
function describePositionLines(position: PointerSample, info: MapInfo): readonly ReadoutLine[] {
  const lines: ReadoutLine[] = [
    { labelKey: 'readout.position', x: `X ${position.x} cell`, y: `Y ${position.y} cell` },
  ];
  const dimensions = worldDimensions(info);
  if (dimensions) {
    const meters = cellOriginMeters(dimensions, position.x, position.y);
    lines.push({
      x: `X ${formatMeters(meters.xMeters)} m`,
      y: `Y ${formatMeters(meters.yMeters)} m`,
    });
  }
  return lines;
}

/** Total length of a measured path, including its preview segment. */
export function segmentMeters(
  dimensions: WorldDimensions,
  from: PointerSample,
  to: PointerSample
): number {
  const dx = (to.u - from.u) * dimensions.widthMeters;
  const dy = (to.v - from.v) * dimensions.heightMeters;
  return Math.hypot(dx, dy);
}

export function measurementMeters(dimensions: WorldDimensions, measurement: Measurement): number {
  const points = measurement.preview
    ? [...measurement.points, measurement.preview]
    : measurement.points;
  let total = 0;
  for (let index = 1; index < points.length; index++) {
    const from = points[index - 1];
    const to = points[index];
    if (from && to) {
      total += segmentMeters(dimensions, from, to);
    }
  }
  return total;
}

/** Total distance of an active measurement, in the fitting unit. */
function measuredItem(measurement: Measurement, info: MapInfo): ReadoutItem | undefined {
  const dimensions = worldDimensions(info);
  if (!dimensions) {
    return undefined;
  }
  const total = measurementMeters(dimensions, measurement);
  if (total <= 0) {
    return undefined;
  }
  return {
    id: 'distance',
    labelKey: 'readout.distance',
    value: formatDistance(total),
    separated: true,
  };
}

function describeValue(inspection: MapInspection | undefined): Pick<ReadoutItem, 'value'> {
  if (!inspection || inspection.kind === 'vector' || inspection.value === undefined) {
    return { value: EMPTY };
  }
  switch (inspection.layerId) {
    case 'world-shape':
      return { value: { key: inspection.value === 1 ? 'readout.inside' : 'readout.outside' } };
    case 'macro-region':
      return { value: { key: 'readout.regionIndex', params: { index: inspection.value } } };
    case 'heat-zones':
      return { value: String(inspection.value) };
    default:
      return { value: inspection.value.toFixed(3) };
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
    {
      id: 'region',
      labelKey: 'readout.region',
      ...(region.label.trim()
        ? { value: region.label }
        : { value: { key: 'readout.regionIndex', params: { index } } }),
    },
    {
      id: 'range',
      labelKey: 'readout.range',
      value: {
        key: region.kind === 'ring' ? 'readout.rangeRing' : 'readout.rangeBand',
        params: {
          from: percent(region.range[0] * (region.kind === 'ring' ? 200 : 100)),
          to: percent(region.range[1] * (region.kind === 'ring' ? 200 : 100)),
        },
      },
    },
    {
      id: 'width',
      labelKey: region.kind === 'ring' ? 'readout.ringThickness' : 'readout.bandWidth',
      value: widthText(region, info),
    },
    { id: 'danger', labelKey: 'readout.danger', value: region.danger.toFixed(2) },
  ];
  const area = areaItem(info, index);
  if (area) {
    items.push(area);
  }
  return items;
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
  const share = total > 0 ? ((area / total) * 100).toFixed(1) : '';
  return {
    id: 'area',
    labelKey: 'readout.area',
    ...(share
      ? { value: { key: 'readout.areaShare', params: { area: formatArea(area), share } } }
      : { value: formatArea(area) }),
  };
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

/** Readout of the BaseClimate current under the pointer. */
function oceanCurrentReadout(inspection: VectorMapInspection): readonly ReadoutItem[] | undefined {
  const hit = inspection.hit;
  if (!hit) {
    return undefined;
  }
  return [
    {
      id: 'current',
      labelKey: 'readout.oceanCurrent',
      value: hit.oceanCurrent
        ? oceanCurrentText(hit.oceanCurrent.angle, hit.oceanCurrent.strength)
        : (hit.label ?? EMPTY),
    },
  ];
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
  return [
    { id: 'region', labelKey: 'readout.region', value: region.id },
    { id: 'type', labelKey: 'readout.type', value: { key: `readout.${region.type}` } },
    {
      id: 'character',
      labelKey: 'readout.character',
      value: { key: `readout.${region.type}Description` },
    },
    ...areaItems(region, plan.worldAreaSquareMeters),
    {
      id: 'edit-region',
      labelKey: 'readout.editRegion',
      value: '',
      action: { id: 'edit-region', labelKey: 'readout.editRegion' },
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
      ? ((region.areaSquareMeters / worldArea) * 100).toFixed(1)
      : '';
  return [
    {
      id: 'area',
      labelKey: 'readout.area',
      ...(share
        ? {
            value: {
              key: 'readout.areaShare',
              params: { area: formatArea(region.areaSquareMeters), share },
            },
          }
        : { value: formatArea(region.areaSquareMeters) }),
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

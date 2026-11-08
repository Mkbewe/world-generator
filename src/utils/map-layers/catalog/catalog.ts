import type { LayerSpec, OverlaySpec } from './layer-spec';
import type { LayerDataRecord, MapBaseLayerId, MapRasters } from './types';
import type { MessageKey } from '../../../i18n';
import { isHeatZoneInfoList } from '../../map-generator/info-definitions';
import { PIPELINE_STAGES } from '../../map-generator/pipeline/stage-definitions';
import {
  type DomainOutputKey,
  RASTER_OUTPUT_KEYS,
  type RasterOutputKey,
} from '../../map-generator/pipeline/stage-outputs';
import {
  BASE_CLIMATE_ZONE_COLORS,
  heatZonePalette,
  HEIGHTMAP_STOPS,
  MOISTURE_STOPS,
  REGION_COLORS,
} from '../palettes/palettes';

const STAGE_ORDER = new Map<string, number>(
  PIPELINE_STAGES.map((stage, index) => [stage.id, index] as const)
);

/** A catalog entry bound to a real generator output; a typo fails here, not in the renderer. */
type BoundLayerSpec = LayerSpec & { readonly source: RasterOutputKey | DomainOutputKey };

const HEAT_ZONE_FALLBACK_PALETTE = {
  kind: 'discrete' as const,
  colors: BASE_CLIMATE_ZONE_COLORS,
  overflow: { color: [120, 120, 120] as const },
};

const CATALOG_ENTRIES = [
  {
    id: 'world-shape',
    labelKey: 'layers.worldShape',
    kind: 'raster',
    source: 'worldMask',
    dataType: 'uint8',
    providesMask: { insideValue: 1 },
    settingsForm: true,
    readout: true,
    overlay: {
      id: 'world-boundary',
      labelKey: 'overlays.world-boundary',
      defaultVisible: true,
      maskLayer: 'world-shape',
    },
    palette: { kind: 'solid', color: [16, 42, 67] },
  },
  {
    id: 'macro-region',
    labelKey: 'layers.macroRegions',
    kind: 'raster',
    source: 'macroRegionIdMap',
    dataType: 'uint8',
    clipTo: 'world-shape',
    boundarySource: 'region',
    settingsForm: true,
    readout: true,
    palette: { kind: 'discrete', colors: REGION_COLORS, overflow: 'cycle' },
  },
  {
    id: 'heat-zones',
    labelKey: 'layers.heatZones',
    kind: 'raster',
    source: 'heatZoneMap',
    dataType: 'int16',
    clipTo: 'world-shape',
    skipValue: -1,
    settingsForm: true,
    readout: true,
    overlay: {
      id: 'heat-zones',
      labelKey: 'overlays.heat-zones',
      defaultVisible: false,
      baseLayer: 'heat-zones',
      maskLayer: 'world-shape',
      source: 'heatZoneMap',
    },
    group: { id: 'base-climate', labelKey: 'layers.baseClimate' },
    palette: HEAT_ZONE_FALLBACK_PALETTE,
    paletteFromInfo: info =>
      isHeatZoneInfoList(info.heatZoneInfo)
        ? heatZonePalette(info.heatZoneInfo)
        : HEAT_ZONE_FALLBACK_PALETTE,
  },
  {
    id: 'moisture',
    labelKey: 'layers.moisture',
    kind: 'raster',
    source: 'moistureBaseMap',
    dataType: 'float32',
    clipTo: 'world-shape',
    settingsForm: false,
    readout: true,
    overlay: {
      id: 'moisture',
      labelKey: 'overlays.moisture',
      defaultVisible: false,
      baseLayer: 'moisture',
      maskLayer: 'world-shape',
      source: 'moistureBaseMap',
    },
    group: { id: 'base-climate', labelKey: 'layers.baseClimate' },
    palette: { kind: 'ramp', stops: MOISTURE_STOPS },
  },
  {
    id: 'ocean-currents',
    labelKey: 'layers.oceanCurrents',
    kind: 'vector',
    source: 'oceanCurrentMap',
    dataSources: ['oceanCurrentStrength'],
    clipTo: 'world-shape',
    settingsForm: false,
    readout: true,
    overlay: {
      id: 'ocean-currents',
      labelKey: 'overlays.ocean-currents',
      defaultVisible: false,
      baseLayer: 'ocean-currents',
      maskLayer: 'world-shape',
      source: 'oceanCurrentMap',
    },
    group: { id: 'base-climate', labelKey: 'layers.baseClimate' },
  },
  {
    id: 'geology',
    labelKey: 'layers.geology',
    kind: 'vector',
    source: 'geologyPlan',
    clipTo: 'world-shape',
    settingsForm: true,
    readout: true,
  },
  {
    id: 'heightmap',
    labelKey: 'layers.heightmap',
    kind: 'raster',
    source: 'heightmap',
    dataType: 'float32',
    clipTo: 'world-shape',
    settingsForm: true,
    readout: true,
    palette: { kind: 'ramp', stops: HEIGHTMAP_STOPS },
  },
] as const satisfies readonly BoundLayerSpec[];

/**
 * Raster layers currently available in the product. The order follows the
 * pipeline order (`PIPELINE_STAGES`); layers without a stage keep their
 * relative order after the stage layers.
 */
export const LAYER_CATALOG = sortByPipelineOrder(CATALOG_ENTRIES);

function sortByPipelineOrder<T extends readonly LayerSpec[]>(entries: T): T {
  return [...entries].sort(
    (left, right) => stageIndex(left.group?.id ?? left.id) - stageIndex(right.group?.id ?? right.id)
  ) as unknown as T;
}

function stageIndex(id: string): number {
  return STAGE_ORDER.get(id) ?? PIPELINE_STAGES.length;
}

type CatalogEntry = (typeof LAYER_CATALOG)[number];

type OverlayEntry = Extract<CatalogEntry, { readonly overlay: unknown }>;

type OverlayIdOfEntry<T> = T extends {
  readonly overlay: { readonly id: infer Id extends string };
}
  ? Id
  : never;

/** Every overlay the catalog declares, derived from its layer entry. */
export type MapOverlayId = OverlayIdOfEntry<CatalogEntry>;

/** One overlay's presentation facts, resolved from its catalog entry. */
export interface OverlayDescriptor {
  readonly id: MapOverlayId;
  readonly labelKey: MessageKey;
  readonly defaultVisible: boolean;
  /** Base layer this overlay duplicates; suppressed while that layer is displayed. */
  readonly baseLayer?: MapBaseLayerId;
  /** Layer whose spatial mask gives the overlay its world frame. */
  readonly maskLayer: MapBaseLayerId;
  /** Data key that gates the overlay; absent for overlays backed by a mask. */
  readonly source?: string;
}

function hasOverlay(entry: CatalogEntry): entry is OverlayEntry {
  return 'overlay' in entry && entry.overlay !== undefined;
}

const OVERLAY_ENTRIES = LAYER_CATALOG.filter(hasOverlay);

function overlayIdOf(entry: OverlayEntry): MapOverlayId {
  return entry.overlay.id;
}

function overlayDescriptorOf(entry: OverlayEntry): OverlayDescriptor {
  const overlay: OverlaySpec<MapBaseLayerId> = entry.overlay;
  return {
    id: overlayIdOf(entry),
    labelKey: overlay.labelKey,
    defaultVisible: overlay.defaultVisible,
    baseLayer: overlay.baseLayer,
    maskLayer: overlay.maskLayer,
    source: overlay.source,
  };
}

export const OVERLAY_CATALOG: readonly OverlayDescriptor[] =
  OVERLAY_ENTRIES.map(overlayDescriptorOf);
export const OVERLAY_IDS: readonly MapOverlayId[] = OVERLAY_ENTRIES.map(overlayIdOf);

const OVERLAYS_BY_ID = new Map<MapOverlayId, OverlayDescriptor>(
  OVERLAY_CATALOG.map(descriptor => [descriptor.id, descriptor])
);

export function overlayDescriptor(id: MapOverlayId): OverlayDescriptor {
  const descriptor = OVERLAYS_BY_ID.get(id);
  if (!descriptor) {
    throw new Error(`Unknown overlay: ${id}`);
  }
  return descriptor;
}

/** Runtime lookup for inspection payloads that carry a plain string ID. */
export function findOverlayDescriptor(id: string): OverlayDescriptor | undefined {
  return OVERLAY_CATALOG.find(descriptor => descriptor.id === id);
}

/** Catalog entries that carry a raster. */
export const RASTER_CATALOG = LAYER_CATALOG.filter(
  (spec): spec is Extract<CatalogEntry, { kind: 'raster' }> => spec.kind === 'raster'
);

const PERSISTENT_RASTER_SOURCES = new Set<string>(RASTER_OUTPUT_KEYS);

/**
 * Whether every raster key belongs to the current persistent output set. Keys
 * outside it fail this check, so callers drop the snapshot instead of
 * re-saving stale rasters. Preview visibility plays no role here: a raster
 * without a catalog layer is still a current output.
 */
export function hasCurrentRasterOutputs(data: LayerDataRecord): boolean {
  return Object.keys(data).every(key => PERSISTENT_RASTER_SOURCES.has(key));
}

/** Selects only catalog-owned raster sources at the dynamic data boundary. */
export function selectRasters(data: LayerDataRecord): MapRasters {
  const selected: Record<string, unknown> = {};
  for (const spec of RASTER_CATALOG) {
    if (Object.hasOwn(data, spec.source) && data[spec.source] !== undefined) {
      selected[spec.source] = data[spec.source];
    }
  }
  return selected as MapRasters;
}

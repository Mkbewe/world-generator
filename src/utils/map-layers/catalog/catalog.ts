import type { LayerSpec } from './layer-spec';
import type { LayerDataRecord, MapRasters } from './types';
import { PIPELINE_STAGES } from '../../map-generator/pipeline/stage-definitions';
import {
  type DomainOutputKey,
  RASTER_OUTPUT_KEYS,
  type RasterOutputKey,
} from '../../map-generator/pipeline/stage-outputs';
import { REGION_COLORS } from '../palettes/palettes';

const STAGE_ORDER = new Map<string, number>(
  PIPELINE_STAGES.map((stage, index) => [stage.id, index] as const)
);

/** A catalog entry bound to a real generator output; a typo fails here, not in the renderer. */
type BoundLayerSpec = LayerSpec & { readonly source: RasterOutputKey | DomainOutputKey };

const CATALOG_ENTRIES = [
  {
    id: 'world-shape',
    label: 'World shape',
    kind: 'raster',
    source: 'worldMask',
    dataType: 'uint8',
    providesMask: { insideValue: 1 },
    palette: { kind: 'solid', color: [16, 42, 67] },
  },
  {
    id: 'macro-region',
    label: 'Macro regions',
    kind: 'raster',
    source: 'macroRegionIdMap',
    dataType: 'uint8',
    clipTo: 'world-shape',
    boundarySource: 'region',
    palette: { kind: 'discrete', colors: REGION_COLORS, overflow: 'cycle' },
  },
  {
    id: 'geology',
    label: 'Geology',
    kind: 'vector',
    source: 'geologyPlan',
    clipTo: 'world-shape',
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
    (left, right) => stageIndex(left.id) - stageIndex(right.id)
  ) as unknown as T;
}

function stageIndex(id: string): number {
  return STAGE_ORDER.get(id) ?? PIPELINE_STAGES.length;
}

type CatalogEntry = (typeof LAYER_CATALOG)[number];

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

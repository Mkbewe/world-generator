import type { LayerSpec } from './layer-spec';
import type { LayerDataRecord, MapRasters } from './types';
import { PIPELINE_STAGES } from '../../map-generator/pipeline/stage-definitions';
import type { DomainOutputKey, RasterOutputKey } from '../../map-generator/pipeline/stage-outputs';
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
    samples: ['noise'],
    palette: { kind: 'discrete', colors: REGION_COLORS, overflow: 'cycle' },
  },
  {
    id: 'landmass-layout',
    label: 'Landmasses',
    kind: 'vector',
    source: 'landmassLayout',
    clipTo: 'world-shape',
    group: { id: 'landmass', label: 'Landmasses' },
  },
  {
    id: 'structure-character',
    label: 'Character',
    kind: 'vector',
    source: 'structureZones',
    clipTo: 'world-shape',
    reads: ['landmassLayout'],
    group: { id: 'landmass', label: 'Landmasses' },
  },
  {
    id: 'noise',
    label: 'Noise',
    kind: 'raster',
    source: 'noiseMap',
    dataType: 'float32',
    clipTo: 'world-shape',
    palette: {
      kind: 'ramp',
      stops: [
        { at: 0, color: [0, 0, 0] },
        { at: 1, color: [255, 255, 255] },
      ],
    },
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

/**
 * Whether every raster key belongs to the current catalog. Snapshots saved in an
 * older format fail this check, so callers can drop them instead of re-saving
 * stale rasters.
 */
export function hasCurrentRasterSources(data: LayerDataRecord): boolean {
  return Object.keys(data).every(key => RASTER_CATALOG.some(spec => spec.source === key));
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

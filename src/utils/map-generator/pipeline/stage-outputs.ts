import { isLandmassLayout } from '../stages/landmass';
import { isStructureProfiles, isStructureRegions } from '../stages/structure-character';
import type { MapState, StageData } from '../types';

/** Raster keys the generator owns. The layer catalog may display them, not define them. */
export const RASTER_OUTPUT_KEYS = ['worldMask', 'noiseMap', 'macroRegionIdMap'] as const;

/** Domain keys produced by stages and restored with the rasters on a later run. */
export const DOMAIN_OUTPUT_KEYS = [
  'landmassLayout',
  'structureProfiles',
  'structureRegions',
] as const;

export type RasterOutputKey = (typeof RASTER_OUTPUT_KEYS)[number];
export type DomainOutputKey = (typeof DOMAIN_OUTPUT_KEYS)[number];
export type MapRasterOutputs = Pick<MapState, RasterOutputKey>;

const domainReaders = {
  landmassLayout: isLandmassLayout,
  structureProfiles: isStructureProfiles,
  structureRegions: isStructureRegions,
} satisfies {
  [Key in DomainOutputKey]: (value: unknown) => value is NonNullable<MapState[Key]>;
};

/** Domain outputs present in stage data or a saved info record. Unknown shapes are dropped. */
export function selectDomainOutputs(data: object): Partial<Pick<MapState, DomainOutputKey>> {
  const record = asRecord(data);
  const outputs: Partial<Pick<MapState, DomainOutputKey>> = {};
  for (const key of DOMAIN_OUTPUT_KEYS) {
    if (!Object.hasOwn(record, key)) {
      continue;
    }
    const value = record[key];
    if (domainReaders[key](value)) {
      assignDomainOutput(outputs, key, value);
    }
  }
  return outputs;
}

/** Stores one guarded value under a key known only at runtime. */
function assignDomainOutput<Key extends DomainOutputKey>(
  outputs: Partial<Pick<MapState, DomainOutputKey>>,
  key: Key,
  value: unknown
): void {
  // The value was accepted by `domainReaders[key]` right before this call.
  outputs[key] = value as NonNullable<MapState[Key]>;
}

/**
 * Copies declared stage writes onto the shared state. `StageData` is the
 * untyped event payload, so each value is accepted only after the key check.
 */
export function commitStageWrites<TState extends object, TId extends string = string>(
  state: TState,
  stageId: TId,
  writes: readonly (keyof TState)[] | undefined,
  data: StageData
): void {
  if (!writes) {
    return;
  }
  for (const key of writes) {
    const name = String(key);
    if (!Object.hasOwn(data, name) || data[name] === undefined) {
      throw new Error(`Stage "${stageId}" did not write "${name}".`);
    }
    state[key] = data[name] as TState[typeof key];
  }
}

function asRecord(data: object): Record<string, unknown> {
  return data as Record<string, unknown>;
}

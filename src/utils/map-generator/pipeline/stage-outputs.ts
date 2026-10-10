import { isGeologyPlan } from '../stages/geology';
import type { MapState, StageData } from '../types';

/** Raster keys the generator owns. The layer catalog may display them, not define them. */
export const RASTER_OUTPUT_KEYS = ['worldMask', 'macroRegionIdMap'] as const;

/** Domain keys produced by stages and restored with the rasters on a later run. */
export const DOMAIN_OUTPUT_KEYS = ['geologyPlan', 'macroRegionAreas'] as const;

export type RasterOutputKey = (typeof RASTER_OUTPUT_KEYS)[number];
export type DomainOutputKey = (typeof DOMAIN_OUTPUT_KEYS)[number];
export type MapRasterOutputs = Pick<MapState, RasterOutputKey>;

/**
 * Constructor per persistent raster key. Same vocabulary as `assertStageOutput`
 * in `./stage`: a stage changing its output type must update both, pinned by
 * the cross-check test over a real run.
 */
export const PERSISTENT_RASTER_TYPES: Record<RasterOutputKey, 'uint8' | 'float32'> = {
  worldMask: 'uint8',
  macroRegionIdMap: 'uint8',
};

const rasterConstructors = {
  uint8: Uint8Array,
  float32: Float32Array,
} as const;

/** Whether a state key names one of the persistent raster outputs. */
export function isRasterOutputKey(value: string): value is RasterOutputKey {
  return (RASTER_OUTPUT_KEYS as readonly string[]).includes(value);
}

/** Whether a value satisfies the constructor declared for a raster output. */
export function isPersistentRasterValue(key: RasterOutputKey, value: unknown): boolean {
  return value instanceof rasterConstructors[PERSISTENT_RASTER_TYPES[key]];
}

/**
 * Persistent generator rasters in unknown data. Unlike the preview catalog
 * selector, this keeps every output the next stage needs — even with no
 * preview layer for it. Returns a new record over the shared buffers (no
 * copies); checks constructors only, lengths belong to stage `validate`.
 * Unknown keys are dropped, a declared key with a wrong constructor fails
 * loudly: a stage that breaks its output type must not disappear silently.
 */
export function selectPersistentRasters(data: object): Partial<Pick<MapState, RasterOutputKey>> {
  const record = asRecord(data);
  const outputs: Partial<Pick<MapState, RasterOutputKey>> = {};
  for (const key of RASTER_OUTPUT_KEYS) {
    if (!Object.hasOwn(record, key)) {
      continue;
    }
    const value = record[key];
    if (value === undefined) {
      continue;
    }
    if (!isPersistentRasterValue(key, value)) {
      throw new Error(`Stage output "${key}" has an invalid type.`);
    }
    assignRasterOutput(outputs, key, value);
  }
  return outputs;
}

/** Stores one guarded raster under a key known only at runtime. */
function assignRasterOutput<Key extends RasterOutputKey>(
  outputs: Partial<Pick<MapState, RasterOutputKey>>,
  key: Key,
  value: unknown
): void {
  // The value was accepted by the `PERSISTENT_RASTER_TYPES` guard above.
  outputs[key] = value as NonNullable<MapState[Key]>;
}

const domainReaders = {
  geologyPlan: isGeologyPlan,
  macroRegionAreas: isMacroRegionAreas,
} satisfies {
  [Key in DomainOutputKey]: (value: unknown) => value is NonNullable<MapState[Key]>;
};

/** Per-region ground areas: a finite, non-negative number per region. */
function isMacroRegionAreas(value: unknown): value is readonly number[] {
  return (
    Array.isArray(value) &&
    value.every(entry => typeof entry === 'number' && Number.isFinite(entry) && entry >= 0)
  );
}

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

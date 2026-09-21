import { createMapGenerator } from './pipeline-factory';
import type { MapConfig } from './types';

/**
 * Stage ids that must run again for `next`: the first stage whose declared
 * configuration slices changed and every later stage, because the linear
 * pipeline makes later stages depend on the earlier ones.
 */
export function selectDirtyStageIds(
  previous: Readonly<MapConfig> | undefined,
  next: Readonly<MapConfig>
): readonly string[] {
  const stages = createMapGenerator().stages;
  if (!previous) {
    return stages.map(stage => stage.id);
  }

  for (const [index, stage] of stages.entries()) {
    const changed = stage.configKeys.some(
      key => !isEqual(configSlice(previous, key), configSlice(next, key))
    );
    if (changed) {
      return stages.slice(index).map(stage => stage.id);
    }
  }
  return [];
}

/** Reads a dotted configuration path such as `world.dimensions`. */
function configSlice(config: Readonly<MapConfig>, key: string): unknown {
  return key.split('.').reduce<unknown>((value, part) => {
    return typeof value === 'object' && value !== null
      ? (value as Record<string, unknown>)[part]
      : undefined;
  }, config);
}

/** Structural comparison of the plain JSON values used by the configuration. */
function isEqual(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) {
    return true;
  }
  if (typeof left !== 'object' || typeof right !== 'object' || !left || !right) {
    return false;
  }
  if (Array.isArray(left) || Array.isArray(right)) {
    return (
      Array.isArray(left) &&
      Array.isArray(right) &&
      left.length === right.length &&
      left.every((value, index) => isEqual(value, right[index]))
    );
  }

  const leftRecord = left as Record<string, unknown>;
  const rightRecord = right as Record<string, unknown>;
  const leftKeys = Object.keys(leftRecord);
  return (
    leftKeys.length === Object.keys(rightRecord).length &&
    leftKeys.every(
      key => Object.hasOwn(rightRecord, key) && isEqual(leftRecord[key], rightRecord[key])
    )
  );
}

import { PIPELINE_STAGES, type PipelineStageId, type StageDefinition } from './stage-definitions';
import type { MapConfig } from './types';

/**
 * Stage ids that must run again for `next`: exactly the stages whose declared
 * configuration slices changed. Unconditional keys always count; conditional
 * keys only while the previous or the next configuration selects them — e.g.
 * macro regions follow `noise` solely under the `noise-map` border source.
 * The keys already cover what a stage inherits through the outputs of earlier
 * stages, so no stage is dragged in by its position in the pipeline.
 */
export function selectDirtyStageIds(
  previous: Readonly<MapConfig> | undefined,
  next: Readonly<MapConfig>
): readonly PipelineStageId[] {
  if (!previous) {
    return PIPELINE_STAGES.map(stage => stage.id);
  }

  return PIPELINE_STAGES.filter(stage => isStageDirty(stage, previous, next)).map(
    stage => stage.id
  );
}

function isStageDirty(
  stage: StageDefinition,
  previous: Readonly<MapConfig>,
  next: Readonly<MapConfig>
): boolean {
  if (stage.configKeys.some(key => !isEqual(configSlice(previous, key), configSlice(next, key)))) {
    return true;
  }
  return (stage.conditionalKeys ?? []).some(
    ({ key, when }) =>
      !isEqual(configSlice(previous, key), configSlice(next, key)) && (when(previous) || when(next))
  );
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

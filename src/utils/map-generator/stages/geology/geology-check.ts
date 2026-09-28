import {
  MAX_AREA_EXTENT,
  MAX_GEOLOGICAL_AREAS,
  MAX_SEABED_OFFSET_METERS,
  MAX_SHELF_WIDTH_METERS,
  MAX_UPLIFT_SCALE_METERS,
  MIN_AREA_EXTENT,
  MIN_SEABED_OFFSET_METERS,
  MIN_SHELF_WIDTH_METERS,
  MIN_UPLIFT_SCALE_METERS,
} from './defaults';
import { isTerrainCharacter, isTerrainProfile } from '../../terrain-profile';
import type { GeologicalAreaConfig, GeologyConfig, GeologyPlan } from '../../types';

/** Whether unknown data is a geology configuration within its domain limits. */
export function isGeologyConfig(value: unknown): value is GeologyConfig {
  try {
    validateGeologyConfig(value);
    return true;
  } catch {
    return false;
  }
}

/**
 * Throws when a geology configuration breaks a range or an id invariant.
 *
 * Temporary during the geology cutover: the `unknown` input lets callers
 * validate untrusted data without a cast.
 */
export function validateGeologyConfig(config: unknown): asserts config is GeologyConfig {
  if (!isRecord(config) || !Array.isArray(config.areas)) {
    throw new Error('A geology configuration needs an area list.');
  }
  if (config.areas.length > MAX_GEOLOGICAL_AREAS) {
    throw new Error(`A geology configuration accepts at most ${MAX_GEOLOGICAL_AREAS} areas.`);
  }

  const ids = new Set<string>();
  for (const area of config.areas) {
    validateArea(area, ids);
  }
}

/** Whether unknown data is one geological area within its domain limits. */
export function isGeologicalAreaConfig(value: unknown): value is GeologicalAreaConfig {
  try {
    validateArea(value, new Set<string>());
    return true;
  } catch {
    return false;
  }
}

/** Whether unknown data is a resolved geology plan that passes every invariant. */
export function isGeologyPlan(value: unknown): value is GeologyPlan {
  try {
    validateGeologyPlan(value);
    return true;
  } catch {
    return false;
  }
}

/**
 * Throws when a plan breaks its invariants. Areas must be ordered by id, so
 * the diagnostic provenance index is stable when the config list order changes.
 */
export function validateGeologyPlan(plan: unknown): void {
  if (!isRecord(plan) || !Array.isArray(plan.areas)) {
    throw new Error('A geology plan needs an area list.');
  }

  let previousId = '';
  for (const area of plan.areas) {
    const id = validatePlanArea(area);
    if (id <= previousId) {
      throw new Error('Geology plan areas must be unique and ordered by id.');
    }
    previousId = id;
  }
}

function validateArea(area: unknown, ids: Set<string>): void {
  if (!isRecord(area) || typeof area.id !== 'string' || area.id.length === 0) {
    throw new Error('Every geological area needs a non-empty id.');
  }
  if (ids.has(area.id)) {
    throw new Error(`Duplicate geological area id "${area.id}".`);
  }
  ids.add(area.id);
  if (!isPlacement(area.placement)) {
    throw new Error(`Area "${area.id}" has an invalid placement.`);
  }
  validateAreaNumbers(area, area.id);
}

/** Validates one resolved plan area and returns its id. */
function validatePlanArea(area: unknown): string {
  if (!isRecord(area) || typeof area.id !== 'string' || area.id.length === 0) {
    throw new Error('Every geology plan area needs a non-empty id.');
  }
  if (!isNormalizedPoint(area.centre)) {
    throw new Error(`Plan area "${area.id}" has an invalid centre.`);
  }
  validateAreaNumbers(area, area.id);
  if (!isTerrainProfile(area.profile)) {
    throw new Error(`Plan area "${area.id}" has an invalid profile.`);
  }
  return area.id;
}

/** Shared numeric contract of a configured area and its resolved plan twin. */
function validateAreaNumbers(area: Record<string, unknown>, id: string): void {
  if (!isWithin(area.extent, MIN_AREA_EXTENT, MAX_AREA_EXTENT)) {
    throw new Error(`Area "${id}" extent must be within ${MIN_AREA_EXTENT}..${MAX_AREA_EXTENT}.`);
  }
  if (!isNormalized(area.elongation)) {
    throw new Error(`Area "${id}" elongation must be normalized.`);
  }
  if (!isDirection(area.direction)) {
    throw new Error(`Area "${id}" direction must be a normalized heading in [0, 2π).`);
  }
  if (!isNormalized(area.upliftDensity)) {
    throw new Error(`Area "${id}" uplift density must be normalized.`);
  }
  if (!isWithin(area.upliftScaleMeters, MIN_UPLIFT_SCALE_METERS, MAX_UPLIFT_SCALE_METERS)) {
    throw new Error(
      `Area "${id}" uplift scale must be within ${MIN_UPLIFT_SCALE_METERS}..${MAX_UPLIFT_SCALE_METERS} m.`
    );
  }
  if (!isNormalized(area.fragmentation)) {
    throw new Error(`Area "${id}" fragmentation must be normalized.`);
  }
  if (!isWithin(area.seabedOffsetMeters, MIN_SEABED_OFFSET_METERS, MAX_SEABED_OFFSET_METERS)) {
    throw new Error(
      `Area "${id}" seabed offset must be within ${MIN_SEABED_OFFSET_METERS}..${MAX_SEABED_OFFSET_METERS} m.`
    );
  }
  if (!isWithin(area.shelfWidthMeters, MIN_SHELF_WIDTH_METERS, MAX_SHELF_WIDTH_METERS)) {
    throw new Error(
      `Area "${id}" shelf width must be within ${MIN_SHELF_WIDTH_METERS}..${MAX_SHELF_WIDTH_METERS} m.`
    );
  }
  if (!isNormalized(area.rimStrength)) {
    throw new Error(`Area "${id}" rim strength must be normalized.`);
  }
  if (!isTerrainCharacter(area.relief)) {
    throw new Error(`Area "${id}" relief must be a terrain character.`);
  }
}

function isPlacement(value: unknown): boolean {
  if (!isRecord(value)) {
    return false;
  }
  if (value.kind === 'automatic') {
    return true;
  }
  return value.kind === 'fixed' && isNormalizedPoint(value.position);
}

function isNormalizedPoint(value: unknown): boolean {
  return isRecord(value) && isNormalized(value.x) && isNormalized(value.y);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isNormalized(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1;
}

function isDirection(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value < Math.PI * 2;
}

function isWithin(value: unknown, min: number, max: number): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;
}

import {
  GEOLOGICAL_REGION_TYPES,
  type GeologicalRegionType,
  type GeologyConfig,
  type GeologyPlan,
} from '../../../types';
import {
  MAX_GEOLOGICAL_REGIONS,
  MAX_REGION_SIZE,
  MIN_GEOLOGICAL_REGIONS,
  MIN_REGION_SIZE,
} from '../defaults';

export function isGeologyConfig(value: unknown): value is GeologyConfig {
  try {
    validateGeologyConfig(value);
    return true;
  } catch {
    return false;
  }
}

/** Validates the region-only geology configuration. */
export function validateGeologyConfig(config: unknown): asserts config is GeologyConfig {
  if (!isRecord(config)) {
    throw new Error('A geology configuration must be an object.');
  }
  if (!isWithinInteger(config.regionCount, MIN_GEOLOGICAL_REGIONS, MAX_GEOLOGICAL_REGIONS)) {
    throw new Error(
      `Region count must be an integer from ${MIN_GEOLOGICAL_REGIONS} to ${MAX_GEOLOGICAL_REGIONS}.`
    );
  }
  if (!isRecord(config.layout)) {
    throw new Error('A geology configuration needs a layout.');
  }
  validateUnit(config.layout.evenness, 'Evenness');
  validateUnit(config.layout.irregularity, 'Irregularity');
  if (!Array.isArray(config.regions) || config.regions.length !== config.regionCount) {
    throw new Error('A geology configuration needs exactly one entry per region.');
  }
  config.regions.forEach((region, index) => validateRegionConfig(region, index));
}

function validateRegionConfig(value: unknown, index: number): void {
  if (!isRecord(value) || !isRegionType(value.type)) {
    throw new Error(`Region ${index + 1} needs an ordinary, volcanic or atoll type.`);
  }
  if (!isWithinNumber(value.size, MIN_REGION_SIZE, MAX_REGION_SIZE)) {
    throw new Error(
      `Region ${index + 1} size must be a number from ${MIN_REGION_SIZE} to ${MAX_REGION_SIZE}.`
    );
  }
}

function validateUnit(value: unknown, label: string): void {
  if (!isWithinNumber(value, 0, 1)) {
    throw new Error(`${label} must be a number from 0 to 1.`);
  }
}

/** Plans already accepted by the full contract check; consumers treat them as read-only. */
const validatedPlans = new WeakSet<object>();

export function isGeologyPlan(value: unknown): value is GeologyPlan {
  try {
    validateGeologyPlan(value);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validates the full region-raster contract shared by preview and analysis
 * consumers; re-checking the same object is a no-op.
 */
export function validateGeologyPlan(plan: unknown): asserts plan is GeologyPlan {
  if (isRecord(plan) && validatedPlans.has(plan)) {
    return;
  }
  if (!isRecord(plan) || !Array.isArray(plan.regions) || !isRecord(plan.regionRasterSize)) {
    throw new Error('A geology plan needs region metadata and raster dimensions.');
  }
  const { width, height } = plan.regionRasterSize;
  if (!isPositiveInteger(width) || !isPositiveInteger(height)) {
    throw new Error('Region raster dimensions must be positive integers.');
  }
  if (
    !(plan.regionOwnerMap instanceof Int16Array) ||
    !(plan.regionBorderDistanceMap instanceof Float32Array)
  ) {
    throw new Error('Region plans need owner and border-distance rasters.');
  }
  const cells = width * height;
  if (plan.regionOwnerMap.length !== cells || plan.regionBorderDistanceMap.length !== cells) {
    throw new Error('Region rasters must match their declared dimensions.');
  }
  if (plan.regions.length === 0) {
    throw new Error('A geology plan needs at least one region.');
  }
  if (!isPositiveNumber(plan.worldAreaSquareMeters)) {
    throw new Error('A geology plan needs the area of the world it covers.');
  }
  plan.regions.forEach((region, index) => validateRegionPlan(region, index));
  for (let index = 0; index < cells; index++) {
    const owner = plan.regionOwnerMap[index];
    if (owner < -1 || owner >= plan.regions.length) {
      throw new Error('Region owner raster contains an invalid owner.');
    }
  }
  validatedPlans.add(plan);
}

function validateRegionPlan(value: unknown, index: number): void {
  if (!isRecord(value) || value.id !== `region-${index + 1}`) {
    throw new Error('Region plan metadata is invalid.');
  }
  if (!isRegionType(value.type)) {
    throw new Error(`Region plan "${value.id}" has an unknown type.`);
  }
  if (!isPoint(value.centre)) {
    throw new Error(`Region plan "${value.id}" has an invalid anchor.`);
  }
  if (typeof value.weight !== 'number' || !Number.isFinite(value.weight) || value.weight <= 0) {
    throw new Error(`Region plan "${value.id}" has an invalid weight.`);
  }
  if (!isNonNegativeNumber(value.areaSquareMeters)) {
    throw new Error(`Region plan "${value.id}" has an invalid area.`);
  }
}

function isRegionType(value: unknown): value is GeologicalRegionType {
  return (
    typeof value === 'string' && (GEOLOGICAL_REGION_TYPES as readonly string[]).includes(value)
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isWithinInteger(value: unknown, minimum: number, maximum: number): value is number {
  return (
    typeof value === 'number' && Number.isInteger(value) && value >= minimum && value <= maximum
  );
}

function isWithinNumber(value: unknown, minimum: number, maximum: number): value is number {
  return (
    typeof value === 'number' && Number.isFinite(value) && value >= minimum && value <= maximum
  );
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0;
}

function isPositiveNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function isNonNegativeNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function isPoint(value: unknown): value is { readonly x: number; readonly y: number } {
  return isRecord(value) && isWithinNumber(value.x, 0, 1) && isWithinNumber(value.y, 0, 1);
}

import {
  type BaseClimateConfig,
  HEAT_ZONE_CLASSES,
  type HeatZoneGeometry,
  OCEAN_CURRENT_FLOWS,
} from '../../../types';
import {
  MAX_HEAT_ZONES,
  MAX_OCEAN_CURRENT_RADIUS,
  MAX_OCEAN_CURRENT_SOURCES,
  MIN_HEAT_ZONES,
} from '../defaults';

/** Throws when the layout cannot produce valid heat-zone and current maps. */
export function validateBaseClimateConfig(config: BaseClimateConfig): void {
  if (config.zones.length < MIN_HEAT_ZONES) {
    throw new RangeError('At least one heat zone is required.');
  }
  if (config.zones.length > MAX_HEAT_ZONES) {
    throw new RangeError(`At most ${MAX_HEAT_ZONES} heat zones are allowed.`);
  }
  if (!Array.isArray(config.currents) || config.currents.length === 0) {
    throw new RangeError('At least one ocean current source is required.');
  }
  if (config.currents.length > MAX_OCEAN_CURRENT_SOURCES) {
    throw new RangeError(`At most ${MAX_OCEAN_CURRENT_SOURCES} ocean current sources are allowed.`);
  }
  if (!isNormalized(config.geologyCoupling)) {
    throw new RangeError('Geology coupling must be within 0..1.');
  }

  const ids = new Set<string>();
  for (const zone of config.zones) {
    if (!zone.id) {
      throw new RangeError('Heat zone id must not be empty.');
    }
    if (ids.has(zone.id)) {
      throw new RangeError(`Duplicate heat zone id: "${zone.id}".`);
    }
    ids.add(zone.id);
    if (!zone.label) {
      throw new RangeError(`Heat zone "${zone.id}" must have a label.`);
    }
    if (!HEAT_ZONE_CLASSES.includes(zone.thermal)) {
      throw new RangeError(`Heat zone "${zone.id}" has an invalid thermal class.`);
    }
    validateGeometry(zone.id, zone.geometry);
  }

  for (const source of config.currents) {
    if (typeof source !== 'object' || source === null) {
      throw new RangeError('Ocean current source must be an object.');
    }
    if (!isNormalized(source.center.x) || !isNormalized(source.center.y)) {
      throw new RangeError('Ocean current centre must be within 0..1.');
    }
    if (!OCEAN_CURRENT_FLOWS.includes(source.flow)) {
      throw new RangeError(`Ocean current flow "${source.flow}" is invalid.`);
    }
    if (!isNormalized(source.strength)) {
      throw new RangeError('Ocean current strength must be within 0..1.');
    }
    if (
      !Number.isFinite(source.radius) ||
      !(source.radius > 0 && source.radius <= MAX_OCEAN_CURRENT_RADIUS)
    ) {
      throw new RangeError(`Ocean current radius must be within 0..${MAX_OCEAN_CURRENT_RADIUS}.`);
    }
  }
}

/** Narrows untrusted configuration, e.g. a future saved preset. */
export function isBaseClimateConfig(value: unknown): value is BaseClimateConfig {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  try {
    validateBaseClimateConfig(value as BaseClimateConfig);
    return true;
  } catch {
    return false;
  }
}

function validateGeometry(id: string, geometry: HeatZoneGeometry): void {
  if (geometry.kind === 'ring') {
    if (!isNormalized(geometry.center.x) || !isNormalized(geometry.center.y)) {
      throw new RangeError(`Heat zone "${id}" center must be within 0..1.`);
    }
    if (
      !Number.isFinite(geometry.innerRadius) ||
      !Number.isFinite(geometry.outerRadius) ||
      !(geometry.innerRadius >= 0 && geometry.outerRadius > geometry.innerRadius)
    ) {
      throw new RangeError(`Heat zone "${id}" must have a valid radial range.`);
    }
    return;
  }

  if (geometry.axis !== 'x' && geometry.axis !== 'y') {
    throw new RangeError(`Heat zone "${id}" axis must be "x" or "y".`);
  }
  if (!isNormalized(geometry.center)) {
    throw new RangeError(`Heat zone "${id}" center must be within 0..1.`);
  }
  if (!(geometry.width > 0 && geometry.width <= 1)) {
    throw new RangeError(`Heat zone "${id}" width must be within 0..1.`);
  }
}

function isNormalized(value: number): boolean {
  return Number.isFinite(value) && value >= 0 && value <= 1;
}

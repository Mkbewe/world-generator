import { containsWorld, type WorldShape } from '../../../world-shape';
import {
  type CharacterZone,
  type LandmassLayout,
  TERRAIN_CHARACTERS,
  type TerrainCharacter,
  type TerrainProfile,
  type ZoneGeometry,
} from '../../types';

/** Whether unknown data is a primary terrain character. */
export function isTerrainCharacter(value: unknown): value is TerrainCharacter {
  return typeof value === 'string' && (TERRAIN_CHARACTERS as readonly string[]).includes(value);
}

/** Whether unknown data is a zone geometry of a known kind. */
export function isZoneGeometry(value: unknown): value is ZoneGeometry {
  if (!isRecord(value)) {
    return false;
  }
  switch (value.kind) {
    case 'whole':
      return true;
    case 'half':
      return isHalfAxis(value.axis) && (value.side === 'low' || value.side === 'high');
    case 'center':
      return isNormalized(value.radiusFraction);
    case 'edge':
      return isNormalized(value.widthFraction);
    case 'point':
      return isPoint(value.center) && isNormalized(value.influenceRadius);
    default:
      return false;
  }
}

/** Whether unknown data is one character zone. */
export function isCharacterZone(value: unknown): value is CharacterZone {
  if (!isRecord(value)) {
    return false;
  }
  return (
    typeof value.id === 'string' &&
    typeof value.structureId === 'string' &&
    isTerrainCharacter(value.character) &&
    isZoneGeometry(value.geometry) &&
    isZoneValues(value.values)
  );
}

/** Whether unknown data is a zone value set with normalized values. */
export function isZoneValues(value: unknown): value is TerrainProfile {
  if (!isRecord(value)) {
    return false;
  }
  return VALUE_FIELDS.every(field => isNormalized(value[field]));
}

/** The eight fields every zone value set must carry, in a fixed order. */
const VALUE_FIELDS = [
  'elevation',
  'roughness',
  'mountainStrength',
  'hillStrength',
  'plateauStrength',
  'lakePotential',
  'erosionStrength',
  'coastalCliffStrength',
] as const;

/** Whether unknown data is the zone list of the character stage. */
export function isStructureZones(value: unknown): value is readonly CharacterZone[] {
  return Array.isArray(value) && value.every(isCharacterZone);
}

/**
 * Checks the zones against their layout: every structure has a `whole` zone,
 * every reference resolves, and geometry fractions are normalized.
 */
export function validateZones(
  zones: readonly CharacterZone[],
  layout: LandmassLayout,
  shape: WorldShape
): void {
  const structureIds = new Set(layout.structures.map(structure => structure.id));
  const wholeByStructure = new Map<string, number>();
  const zoneIds = new Set<string>();

  for (const zone of zones) {
    if (!isCharacterZone(zone)) {
      throw new Error('Invalid character zone.');
    }
    if (!structureIds.has(zone.structureId)) {
      throw new Error(`Zone "${zone.id}" references an unknown structure.`);
    }
    if (zoneIds.has(zone.id)) {
      throw new Error(`Duplicate zone id "${zone.id}".`);
    }
    zoneIds.add(zone.id);
    if (zone.geometry.kind === 'whole') {
      wholeByStructure.set(zone.structureId, (wholeByStructure.get(zone.structureId) ?? 0) + 1);
    }
    // Geometry fractions are validated by `isCharacterZone`; only the world
    // containment of a point anchor needs the shape.
    if (zone.geometry.kind === 'point' && !insideShape(shape, zone.geometry.center)) {
      throw new Error(`Zone "${zone.id}" is anchored outside the world.`);
    }
  }

  for (const id of structureIds) {
    if (wholeByStructure.get(id) !== 1) {
      throw new Error(`Structure "${id}" needs exactly one whole character zone.`);
    }
  }
}

function insideShape(
  shape: WorldShape,
  point: { readonly x: number; readonly y: number }
): boolean {
  return containsWorld(shape, 2 * point.x - 1, 2 * point.y - 1);
}

function isHalfAxis(value: unknown): value is 'along' | 'x' | 'y' {
  return value === 'along' || value === 'x' || value === 'y';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isNormalized(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1;
}

function isPoint(value: unknown): value is { x: number; y: number } {
  return isRecord(value) && Number.isFinite(value.x) && Number.isFinite(value.y);
}

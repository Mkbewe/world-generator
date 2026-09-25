import { PROFILE_FIELDS } from './tendencies';
import { containsWorld, type WorldShape } from '../../../world-shape';
import type {
  LandmassLayout,
  StructureRegionDefinition,
  StructureTerrainProfile,
  TerrainProfile,
} from '../../types';

/** Whether unknown data is a terrain value set with normalized values. */
export function isTerrainProfile(value: unknown): value is TerrainProfile {
  return isRecord(value) && PROFILE_FIELDS.every(field => isNormalized(value[field]));
}

/** Whether unknown data is a structure profile with normalized values. */
export function isStructureProfile(value: unknown): value is StructureTerrainProfile {
  if (!isRecord(value) || typeof value.structureId !== 'string') {
    return false;
  }
  return isTerrainProfile(value);
}

/** Whether unknown data is the profile list of the character stage. */
export function isStructureProfiles(value: unknown): value is readonly StructureTerrainProfile[] {
  return Array.isArray(value) && value.every(isStructureProfile);
}

/** Whether unknown data is a region definition with normalized values. */
export function isStructureRegion(value: unknown): value is StructureRegionDefinition {
  if (!isRecord(value)) {
    return false;
  }
  return (
    typeof value.id === 'string' &&
    typeof value.structureId === 'string' &&
    isPoint(value.center) &&
    isNormalized(value.influenceRadius) &&
    isTerrainProfile(value.profile)
  );
}

/** Whether unknown data is the region list of the character stage. */
export function isStructureRegions(value: unknown): value is readonly StructureRegionDefinition[] {
  return Array.isArray(value) && value.every(isStructureRegion);
}

/**
 * Checks the character against its layout: one profile per structure, every
 * reference known, region centers inside the world shape and radii normalized.
 */
export function validateCharacter(
  profiles: readonly StructureTerrainProfile[],
  regions: readonly StructureRegionDefinition[],
  layout: LandmassLayout,
  shape: WorldShape
): void {
  const structureIds = new Set(layout.structures.map(structure => structure.id));
  if (profiles.length !== layout.structures.length) {
    throw new Error('Every structure needs exactly one terrain profile.');
  }

  const profileIds = new Set<string>();
  for (const profile of profiles) {
    if (!isStructureProfile(profile)) {
      throw new Error('A structure profile has values outside 0..1.');
    }
    if (!structureIds.has(profile.structureId)) {
      throw new Error(`Profile references an unknown structure "${profile.structureId}".`);
    }
    if (profileIds.has(profile.structureId)) {
      throw new Error(`Duplicate profile for structure "${profile.structureId}".`);
    }
    profileIds.add(profile.structureId);
  }

  const regionIds = new Set<string>();
  for (const region of regions) {
    if (!isStructureRegion(region)) {
      throw new Error('Invalid structure region.');
    }
    if (!structureIds.has(region.structureId)) {
      throw new Error(`Region "${region.id}" references an unknown structure.`);
    }
    if (regionIds.has(region.id)) {
      throw new Error(`Duplicate region id "${region.id}".`);
    }
    regionIds.add(region.id);
    if (!insideShape(shape, region.center)) {
      throw new Error(`Region "${region.id}" is anchored outside the world.`);
    }
  }
}

function insideShape(
  shape: WorldShape,
  point: { readonly x: number; readonly y: number }
): boolean {
  return containsWorld(shape, 2 * point.x - 1, 2 * point.y - 1);
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

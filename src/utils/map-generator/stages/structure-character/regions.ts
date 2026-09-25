import {
  MAX_REGIONS_PER_STRUCTURE,
  REGION_DENSITY,
  REGION_EXTENT_THRESHOLD,
  REGION_OVERRIDE_AMPLITUDE,
  REGION_RADIUS_BASE,
  REGION_RADIUS_SPREAD,
} from './defaults';
import { clamp01, profileValues } from './profiles';
import { PROFILE_FIELDS } from './tendencies';
import { containsWorld, type WorldShape } from '../../../world-shape';
import type { SeededRandom } from '../../random/seeded-random';
import type {
  GeologicalStructure,
  LandmassNode,
  StructureCharacterConfig,
  StructureRegionDefinition,
  StructureTerrainProfile,
  TerrainProfile,
  WorldPoint,
} from '../../types';
import { mainChainNodes, structureExtent } from '../landmass';

/**
 * Regional overrides per structure. A structure below the extent threshold
 * stays uniform; larger ones are divided into regions with a blended
 * influence. Centers sit on main-corridor nodes that already lie inside the
 * world shape, so a region is never anchored outside the world.
 */
export function buildRegions(
  structures: readonly GeologicalStructure[],
  profiles: readonly StructureTerrainProfile[],
  config: StructureCharacterConfig,
  shape: WorldShape,
  random: SeededRandom
): StructureRegionDefinition[] {
  const regions: StructureRegionDefinition[] = [];

  structures.forEach((structure, index) => {
    regions.push(...buildStructureRegions(structure, profiles[index], config, shape, random));
  });

  return regions;
}

function buildStructureRegions(
  structure: GeologicalStructure,
  profile: StructureTerrainProfile,
  config: StructureCharacterConfig,
  shape: WorldShape,
  random: SeededRandom
): StructureRegionDefinition[] {
  const extent = structureExtent(structure);
  if (extent < REGION_EXTENT_THRESHOLD) {
    return [];
  }

  const candidates = mainChainNodes(structure).filter(node => insideShape(shape, node.position));
  if (candidates.length === 0) {
    return [];
  }

  const count = regionCount(extent, config.regionDensity);
  const regions: StructureRegionDefinition[] = [];

  for (let index = 0; index < count; index++) {
    const at = (index + 1) / (count + 1);
    const picked = clampIndex(
      Math.round(at * (candidates.length - 1)) + random.nextInteger(-1, 1),
      candidates.length
    );
    const node = candidates[picked];
    regions.push({
      id: `${structure.id}-region-${index + 1}`,
      structureId: structure.id,
      center: jitteredCenter(shape, node, random),
      influenceRadius: clamp01(
        extent * (REGION_RADIUS_BASE + random.next() * REGION_RADIUS_SPREAD)
      ),
      profile: overrideProfile(profile, config, random),
    });
  }

  return regions;
}

/**
 * Regions from the extent and the density: zero density keeps every structure
 * uniform, otherwise one to `MAX_REGIONS_PER_STRUCTURE` from the extent.
 */
function regionCount(extent: number, density: number): number {
  if (density <= 0) {
    return 0;
  }
  const wanted = 1 + Math.floor(extent * REGION_DENSITY * density);
  return Math.min(MAX_REGIONS_PER_STRUCTURE, Math.max(1, wanted));
}

/**
 * Copies the structure profile and shifts one or two fields. The shift scales
 * with the profile variation, so at zero variation a region equals its parent.
 * The result is a full value set without identity; the region carries the id.
 */
function overrideProfile(
  profile: StructureTerrainProfile,
  config: StructureCharacterConfig,
  random: SeededRandom
): TerrainProfile {
  const values = profileValues(profile);
  const overrides = random.nextInteger(1, 2);

  for (let index = 0; index < overrides; index++) {
    const field = PROFILE_FIELDS[random.nextInteger(0, PROFILE_FIELDS.length - 1)];
    const delta = (random.next() * 2 - 1) * REGION_OVERRIDE_AMPLITUDE * config.profileVariation;
    values[field] = clamp01(values[field] + delta);
  }

  return values;
}

/** Center on the node, jittered within its radius but kept inside the world. */
function jitteredCenter(shape: WorldShape, node: LandmassNode, random: SeededRandom): WorldPoint {
  const jittered = {
    x: node.position.x + (random.next() * 2 - 1) * node.radius * 0.5,
    y: node.position.y + (random.next() * 2 - 1) * node.radius * 0.5,
  };
  return insideShape(shape, jittered) ? jittered : node.position;
}

function insideShape(shape: WorldShape, point: WorldPoint): boolean {
  return containsWorld(shape, 2 * point.x - 1, 2 * point.y - 1);
}

function clampIndex(value: number, length: number): number {
  return Math.min(length - 1, Math.max(0, value));
}

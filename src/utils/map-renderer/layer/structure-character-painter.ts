import {
  paintStructureBody,
  paintStructureCorridor,
  paintStructureSkeleton,
} from './landmass-layout-painter';
import type { MapSize } from './layer';
import { clipZone } from './zone-geometry';
import { marginInsets, OCEAN_MARGIN_METERS } from '../../map-generator/stages/landmass';
import type { CharacterZone, GeologicalStructure, LandmassLayout } from '../../map-generator/types';
import { characterStyle, type Color } from '../../map-layers';
import type { WorldShape } from '../../world-shape';
import type { MapProjection } from '../view/view-transform';
import { traceErodedWorldBoundary, traceWorldBoundary } from '../world-boundary-renderer';

/** Calm ocean inside the world, shared with the landmass view. */
const OCEAN_COLOR = 'rgb(12, 30, 48)';
/** Solid body, so nothing below shows through the land. */
const BODY_ALPHA = 1;
/** Split zone repaints the corridor it covers with its full colour. */
const ZONE_ALPHA = BODY_ALPHA;
/** Dark skeleton ink drawn over the coloured bodies. */
const SKELETON_INK: Color = [10, 22, 32];
const NEUTRAL_COLOR: Color = [120, 140, 160];

/** One character view: every structure body tinted by its whole zone, splits on top. */
export interface StructureCharacterScene {
  readonly zones: readonly CharacterZone[];
  readonly layout?: LandmassLayout;
  readonly size: MapSize;
  readonly shape?: WorldShape;
  readonly dimensionsMeters?: {
    readonly widthMeters: number;
    readonly heightMeters: number;
  };
}

/** Paints every structure body by its whole zone, then the split zone overrides. */
export function paintStructureCharacter(
  context: CanvasRenderingContext2D,
  projection: MapProjection,
  scene: StructureCharacterScene
): void {
  if (scene.shape) {
    context.save();
    context.beginPath();
    traceWorldBoundary(context, projection, scene.size, scene.shape);
    context.clip();
    context.fillStyle = OCEAN_COLOR;
    context.fill();
  }

  const eroded = scene.shape ? erodedClip(scene, projection) : undefined;
  if (eroded && scene.shape) {
    context.save();
    context.beginPath();
    traceErodedWorldBoundary(context, projection, scene.size, scene.shape, eroded);
    context.clip();
  }

  const structures = scene.layout?.structures ?? [];
  const zones = groupZones(scene.zones);
  for (const structure of structures) {
    paintStructureBody(context, projection, scene.size, structure, {
      color: bodyColor(zones.get(structure.id)),
      fillAlpha: BODY_ALPHA,
      skeleton: false,
    });
  }
  for (const structure of structures) {
    paintSplits(context, projection, scene, structure, zones.get(structure.id) ?? []);
  }
  for (const structure of structures) {
    paintStructureSkeleton(context, projection, scene.size, structure, SKELETON_INK, {
      halo: false,
      lineWidth: 1,
      nodeRadius: 1.5,
      lineCap: 'butt',
      proportionalDots: true,
      smooth: true,
    });
  }

  if (eroded) {
    context.restore();
  }
  if (scene.shape) {
    context.restore();
  }
}

/** Ocean-margin clip in canvas pixels, when the scene knows the physical size. */
function erodedClip(
  scene: StructureCharacterScene,
  projection: MapProjection
): { readonly x: number; readonly y: number } | undefined {
  if (!scene.shape || !scene.dimensionsMeters) {
    return undefined;
  }
  const insets = marginInsets(
    {
      widthMeters: scene.dimensionsMeters.widthMeters,
      heightMeters: scene.dimensionsMeters.heightMeters,
      sampleWidth: scene.size.width,
      sampleHeight: scene.size.height,
    },
    OCEAN_MARGIN_METERS
  );
  return {
    x: insets.x * Math.max(1, scene.size.width - 1) * projection.cellSize,
    y: insets.y * Math.max(1, scene.size.height - 1) * projection.cellSize,
  };
}

function groupZones(zones: readonly CharacterZone[]): Map<string, CharacterZone[]> {
  const groups = new Map<string, CharacterZone[]>();
  for (const zone of zones) {
    const list = groups.get(zone.structureId) ?? [];
    list.push(zone);
    groups.set(zone.structureId, list);
  }
  return groups;
}

function bodyColor(zones: readonly CharacterZone[] | undefined): Color {
  const whole = zones?.find(zone => zone.geometry.kind === 'whole');
  return whole ? characterStyle(whole.character).color : NEUTRAL_COLOR;
}

function paintSplits(
  context: CanvasRenderingContext2D,
  projection: MapProjection,
  scene: StructureCharacterScene,
  structure: GeologicalStructure,
  zones: readonly CharacterZone[]
): void {
  for (const zone of zones) {
    if (zone.geometry.kind === 'whole') {
      continue;
    }
    context.save();
    clipZone(context, projection, scene.size, structure, zone.geometry);
    paintStructureCorridor(
      context,
      projection,
      scene.size,
      structure,
      characterStyle(zone.character).color,
      ZONE_ALPHA
    );
    context.restore();
  }
}

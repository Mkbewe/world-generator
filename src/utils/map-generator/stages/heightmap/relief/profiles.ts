import { smoothstep } from '../../../../math';
import type { WorldDimensions } from '../../../../world-dimensions';
import type { WorldSpace } from '../../../space';
import type { WorldPoint } from '../../../types';
import type { HeightmapNoiseBands } from '../bands';
import type { RegionShape } from '../config/region-shape';
import { SHELF_DEPTH_METERS } from '../defaults';
import type { IslandBay, IslandForm } from '../forms/forms';

/** Coast and fine band shares of the coastline outline modulation. */
const COAST_LOBE_SHARE = 0.28;
const FINE_LOBE_SHARE = 0.06;
/** Share of the lagoon floor depth that holds right at the ring rim. */
const REEF_RIM_FLOOR_SHARE = 0.4;
/** Floor depth noise around its base, as a share of the depth. */
const REEF_FLOOR_VARIATION = 0.25;
/** Reef crest: base height, the gap slider's bite and the noise swing. */
const REEF_CREST_BASE = 0.9;
const REEF_CREST_GAP = 0.6;
const REEF_CREST_NOISE = 1.6;
/** Below this crest share the ring lies submerged. */
const REEF_CREST_MIN = 0.06;
/** Deepest cut of a fjord channel below the waterline, in metres. */
const FJORD_CHANNEL_DEPTH_METERS = 18;
/** Notch share where a coastal valley becomes a submerged channel. */
const CHANNEL_START = 0.45;
/** Channel wall ramp: the water deepens right away instead of a sand fringe. */
const CHANNEL_WALL_POWER = 0.35;
/** Channel bank: the land keeps half its height right at the water edge. */
const CHANNEL_BANK_DROP = 0.5;
const CHANNEL_BANK_POWER = 3;
/** How much of a bay's middle counts as a sheer coast. */
const CLIFF_BAY_GAIN = 1.6;
/** Lowest share of the peak every island keeps as valley floor. */
const FLAT_LOWLAND_FLOOR = 0.15;
/** How much of its cliff share a near-summit coast realizes. */
const CLIFF_PROXIMITY_GAIN = 4;
/** How strongly a dipping coast band softens the wall into a landing spot. */
const CLIFF_LANDING_DAMP = 0.7;
/** Coast wall ramp: a beach spans the base width with the base exponent. */
const SHEER_WIDTH_BASE = 0.3;
const SHEER_WIDTH_RANGE = 0.24;
const SHEER_POWER_BASE = 0.95;
const SHEER_POWER_RANGE = 0.75;

/** One sampled cell of one form: the shared inputs every profile reads. */
export interface SampleInput {
  readonly form: IslandForm;
  readonly shape: RegionShape;
  readonly band: HeightmapNoiseBands;
  readonly point: WorldPoint;
  readonly warped: WorldPoint;
  /** The summit in the same warped frame as `warped`, transformed once. */
  readonly warpedPeak: WorldPoint;
  readonly distMeters: number;
  readonly age: number;
  readonly dimensions: WorldDimensions;
  readonly space: WorldSpace;
}

export interface ProfileInput extends SampleInput {
  /** Sheer-coast measure of this cell, 0..1, computed once per cell. */
  readonly cliffiness: number;
}

/** Land and water parts of one form sample: land >= 0, carve <= 0, one of them 0. */
export interface FormSample {
  readonly land: number;
  readonly carve: number;
}

/**
 * The radial profile of one form, chosen by its numeric shape fields alone:
 * a reef ring around a submerged lagoon, a dome with a summit crater, or a
 * dome cut by radial coastal channels (fjords).
 */
export function formProfile(input: ProfileInput, effectiveRadial: number): FormSample {
  if (input.form.hasCavity && input.shape.cavityFloorShare < 0) {
    return reefProfile(input, effectiveRadial);
  }
  if (input.form.hasCavity) {
    return { land: craterHeight(input, effectiveRadial), carve: 0 };
  }
  const base = domeHeight(input, effectiveRadial);
  return chuteProfile(input, effectiveRadial, base);
}

/**
 * Modulated relative radius: the 2/3/4 harmonic lobes with their phases and
 * the coast and fine noise bend the outline into peninsulas and bays, so
 * every island differs and the shallow shelf follows the same shape.
 */
export function modulatedRadial(input: SampleInput, withBays = true): number {
  const { form, shape, band, point, distMeters } = input;
  const theta = bearingOf(input.warped, input);
  const lobeMod =
    1 +
    shape.warpFactor *
      (form.lobes2 * Math.cos(2 * theta + form.phase2) +
        form.lobes3 * Math.cos(3 * theta + form.phase3) +
        form.lobes4 * Math.cos(4 * theta + form.phase4) +
        COAST_LOBE_SHARE * band.coast(point) +
        FINE_LOBE_SHARE * band.fine(point));
  let bayCut = 0;
  if (withBays) {
    for (const bay of form.bays) {
      bayCut += bay.depth * shape.warpFactor * bayBell(theta, bay);
    }
  }
  return distMeters / form.radiusMeters / Math.max(0.35, lobeMod - bayCut);
}

/**
 * How sheer this coast point is, 0..1: the summit shore of a cliffy type
 * turns into a wall entering the water, the far shore keeps its beach. A
 * dipping coast band softens the wall, which leaves rare landing spots in
 * the bays. Channel banks and bay shores count as sheer too, so a cut into
 * the island runs between walls instead of sand ramps and a shallow floor.
 */
export function cliffinessAt(input: SampleInput, radial: number): number {
  const { form, shape, band, point } = input;
  const peakDistance = input.space.distanceMeters(input.warped, input.warpedPeak);
  const proximity = clamp01(1 - peakDistance / form.radiusMeters);
  const bank = smoothstep(clamp01(channelNotch(input, radial) / CHANNEL_START));
  let bay = 0;
  if (form.bays.length > 0) {
    const theta = bearingOf(input.warped, input);
    for (const cut of form.bays) {
      bay = Math.max(bay, cut.depth * CLIFF_BAY_GAIN * bayBell(theta, cut));
    }
    bay = clamp01(bay);
  }
  // A cliffy type keeps a sheer baseline around its whole coast; the square
  // keeps beachy types beachy.
  const base = shape.cliffShare * shape.cliffShare;
  const coast = band.coast(point);
  const landing = coast < 0 ? 1 + CLIFF_LANDING_DAMP * coast : 1;
  return clamp01(
    Math.max(proximity, bank, bay, base) * shape.cliffShare * CLIFF_PROXIMITY_GAIN * landing
  );
}

/**
 * Dome built around the shifted summit: the mountain ridge rises toward one
 * shore, where the coast narrows into a sheer wall, while the opposite side
 * falls away gently into a wide lowland. The ridge carries a band of its
 * island's mountainousness.
 */
function domeHeight(input: ProfileInput, radial: number): number {
  const { form, shape, band, point } = input;
  const peakRadial =
    input.space.distanceMeters(input.warped, input.warpedPeak) / (form.radiusMeters * 1.15);
  const cliffiness = input.cliffiness;
  const shoreWidth = SHEER_WIDTH_BASE - SHEER_WIDTH_RANGE * cliffiness;
  const shorePower = SHEER_POWER_BASE - SHEER_POWER_RANGE * cliffiness;
  const coastWall = Math.pow(clamp01((1 - radial) / Math.max(0.05, shoreWidth)), shorePower);
  const mountainDome = Math.pow(smoothstep(clamp01(1 - peakRadial)), shape.heightCurve);
  const ridgeWave = clamp01(0.5 + 0.5 * band.ridge(point));
  // Every island keeps valley floors above the shoreline: without them the
  // dome alone would drown the island's far ends.
  const flatShare = Math.max(0.32 * (1 - form.mountainFactor), FLAT_LOWLAND_FLOOR);
  const mountainShare = (1 - flatShare) * mountainDome * (0.6 + 0.4 * ridgeWave);
  return form.peakMeters * coastWall * (flatShare + mountainShare);
}

/**
 * Volcanic cone with a summit caldera: the cone itself peaks exactly at
 * form.peak and the crater sinks its middle to a green-brown floor ringed by
 * the pale summit; the caldera widens and deepens with age.
 */
function craterHeight(input: ProfileInput, effectiveRadial: number): number {
  const { shape, form, band, point, age } = input;
  const peakRadial = input.space.distanceMeters(input.warped, input.warpedPeak) / form.radiusMeters;
  const lowland = smoothstep(clamp01((1 - effectiveRadial) / 0.32));
  const dome = Math.pow(smoothstep(clamp01(1 - peakRadial)), shape.heightCurve);
  const ridgeWave = clamp01(0.5 + 0.5 * band.ridge(point));
  const flatShare = Math.max(0.35 * (1 - form.mountainFactor), FLAT_LOWLAND_FLOOR);
  const mountainShare = (1 - flatShare) * dome * (0.55 + 0.45 * ridgeWave);
  const height = form.peakMeters * lowland * (flatShare + mountainShare);
  const craterRadius = shape.cavityRadiusShare * (0.85 + 0.35 * age);
  if (craterRadius <= 0) {
    return height;
  }
  const crater = smoothstep(clamp01((craterRadius - peakRadial) / (craterRadius * 0.6)));
  const craterFloor = shape.cavityFloorShare * (1 - 0.35 * age);
  return height + crater * (form.peakMeters * craterFloor - height);
}

/**
 * Reef ring: a shallow lagoon basin inside the ring radius and a sandy ring
 * around it. The ring rises out of the water only where the reef noise holds
 * it up, so some atolls stay whole while others break into motu chains.
 */
function reefProfile(input: ProfileInput, radial: number): FormSample {
  const { shape, form, band, point } = input;
  const inner = shape.cavityRadiusShare;
  if (inner <= 0 || radial > 1) {
    return { land: 0, carve: 0 };
  }
  const texture = 0.6 * band.coast(point) + 0.4 * band.fine(point);
  if (radial < inner) {
    // A shallow basin: a few metres deep in the middle, rising to the rim,
    // with gentle noise so the floor is never a flat pane.
    const bowl = smoothstep(clamp01((inner - radial) / (inner * 0.55)));
    const floor =
      SHELF_DEPTH_METERS *
      shape.cavityFloorShare *
      (REEF_RIM_FLOOR_SHARE + (1 - REEF_RIM_FLOOR_SHARE) * bowl) *
      (1 + REEF_FLOOR_VARIATION * texture);
    return { land: 0, carve: floor };
  }
  const crest = REEF_CREST_BASE - REEF_CREST_GAP * form.reefGap + REEF_CREST_NOISE * texture;
  if (crest <= REEF_CREST_MIN) {
    return { land: 0, carve: 0 };
  }
  const u = (radial - inner) / (1 - inner);
  const arch = Math.sin(u * Math.PI);
  return {
    land: form.peakMeters * Math.pow(arch, shape.heightCurve) * crest,
    carve: 0,
  };
}

/**
 * Channel influence at one point, 0 outside a channel up to 1 in its middle:
 * the angular wave of the region's chutes, gated off near the summit and
 * scaled by the type's channel strength.
 */
function channelNotch(input: SampleInput, radial: number): number {
  const { shape, form, band, point, age } = input;
  if (shape.chuteCount <= 0 || shape.chuteStrength <= 0) {
    return 0;
  }
  const theta = bearingOf(input.warped, input);
  const wave = Math.sin(shape.chuteCount * theta + form.chutePhase + 1.6 * band.ridge(point));
  const reach = smoothstep(clamp01((radial - 0.2) / 0.35));
  // Channels cut only into the mountainous side of the island: the far half
  // keeps its ordinary coast with bays and landings.
  const summitAngle = bearingOf(input.warpedPeak, input);
  const side = clamp01((Math.cos(theta - summitAngle) + 0.35) / 0.9);
  return clamp01((wave - (0.38 - 0.18 * age)) / 0.55) * reach * shape.chuteStrength * side;
}

/**
 * Dome cut by radial coastal channels: above the channel threshold the notch
 * only lowers the valley slope, below it the channel cuts a submerged fjord.
 */
function chuteProfile(input: ProfileInput, radial: number, base: number): FormSample {
  const notch = channelNotch(input, radial);
  if (notch <= 0) {
    return { land: base, carve: 0 };
  }
  if (notch <= CHANNEL_START) {
    // The bank holds its height and drops into the channel as a wall.
    const ratio = notch / CHANNEL_START;
    return {
      land: base * (1 - CHANNEL_BANK_DROP * Math.pow(ratio, CHANNEL_BANK_POWER)),
      carve: 0,
    };
  }
  const channel = clamp01((notch - CHANNEL_START) / (1 - CHANNEL_START));
  return {
    land: 0,
    carve: -FJORD_CHANNEL_DEPTH_METERS * Math.pow(channel, CHANNEL_WALL_POWER),
  };
}

/** Bearing of one point around the form centre, in radians. */
function bearingOf(point: WorldPoint, input: SampleInput): number {
  const { form, dimensions } = input;
  return Math.atan2(
    (point.y - form.centre.y) * dimensions.heightMeters,
    (point.x - form.centre.x) * dimensions.widthMeters
  );
}

/** Radial bell of one bay around a bearing, 1 at its centre, 0 outside it. */
function bayBell(theta: number, bay: IslandBay): number {
  const angleDelta = Math.atan2(Math.sin(theta - bay.angle), Math.cos(theta - bay.angle));
  return smoothstep(clamp01(1 - Math.abs(angleDelta) / bay.width));
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

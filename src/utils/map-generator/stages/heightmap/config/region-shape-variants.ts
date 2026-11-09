import type { GeologicalRegionType, HeatZoneClass } from '@generator/types';

import { REGION_SHAPES, type RegionShape } from './region-shape';
import { clamp01 } from '../../../../math';

type RegionShapeOverride = Partial<RegionShape>;

/**
 * Field shifts for each region type and thermal class. Each class only moves
 * existing numbers, so the heightmap never needs a new island algorithm;
 * ordinary's temperate class keeps the base recipe unchanged.
 */
const REGION_SHAPE_VARIANTS: Readonly<
  Record<GeologicalRegionType, Readonly<Partial<Record<HeatZoneClass, RegionShapeOverride>>>>
> = {
  ordinary: {
    warm: {
      coverageFactor: 0.12,
      amplitudeFactor: 0.75,
      heightCurve: 1.35,
      cliffShare: 0.3,
      ridgeShare: 0.2,
      shelfFactor: 3.4,
      maxForms: 9,
    },
    cold: {
      coverageFactor: 0.13,
      minForms: 4,
      maxForms: 13,
      amplitudeFactor: 0.75,
      heightCurve: 1.1,
      cliffShare: 0.35,
      ridgeShare: 0.15,
      shelfFactor: 2.4,
      modulationShare: 0.55,
    },
  },
  volcanic: {
    warm: {
      amplitudeFactor: 2.3,
      heightCurve: 1.55,
      cliffShare: 0.7,
      ridgeShare: 0.7,
      shelfFactor: 1.15,
      cavityShare: 0.95,
      cavityRadiusShare: 0.3,
      cavityFloorShare: 0.17,
    },
    temperate: {
      amplitudeFactor: 1.6,
      heightCurve: 1.35,
      cliffShare: 0.45,
      ridgeShare: 0.45,
      shelfFactor: 1.5,
      cavityShare: 0.75,
      cavityRadiusShare: 0.36,
      cavityFloorShare: 0.1,
    },
    cold: {
      amplitudeFactor: 1.2,
      heightCurve: 1.2,
      cliffShare: 0.3,
      ridgeShare: 0.3,
      shelfFactor: 1.8,
      cavityShare: 0.6,
      cavityRadiusShare: 0.4,
      cavityFloorShare: 0.06,
    },
  },
  lagoon: {
    warm: {
      coverageFactor: 0.08,
      minForms: 4,
      maxForms: 12,
      amplitudeFactor: 0.01,
      heightCurve: 0.7,
      cliffShare: 0.03,
      ridgeShare: 0,
      shelfFactor: 2.8,
      modulationShare: 0.1,
      buildsReef: true,
      cavityRadiusShare: 0.82,
      cavityFloorShare: -0.08,
    },
    temperate: {
      coverageFactor: 0.11,
      minForms: 4,
      maxForms: 10,
      amplitudeFactor: 0.04,
      heightCurve: 0.8,
      cliffShare: 0.15,
      ridgeShare: 0,
      shelfFactor: 2.5,
      modulationShare: 0.2,
      cavityShare: 0,
      buildsReef: false,
      cavityFloorShare: 0,
    },
    cold: {
      coverageFactor: 0.12,
      minForms: 6,
      maxForms: 14,
      amplitudeFactor: 0.022,
      heightCurve: 0.95,
      cliffShare: 0.1,
      ridgeShare: 0.05,
      shelfFactor: 1.8,
      modulationShare: 0.15,
      cavityShare: 0,
      buildsReef: false,
      cavityFloorShare: 0,
    },
  },
  fjord: {
    warm: {
      amplitudeFactor: 1,
      heightCurve: 1.05,
      cliffShare: 0.35,
      ridgeShare: 0.4,
      shelfFactor: 2.4,
      warpFactor: 2,
      modulationShare: 0.6,
      chuteCount: 2,
      chuteStrength: 0.4,
    },
    temperate: {
      amplitudeFactor: 1.2,
      heightCurve: 0.95,
      cliffShare: 0.45,
      ridgeShare: 0.55,
      shelfFactor: 2.15,
      warpFactor: 1.9,
      modulationShare: 0.55,
      chuteCount: 3,
      chuteStrength: 0.7,
    },
    cold: {
      amplitudeFactor: 1.45,
      heightCurve: 0.8,
      cliffShare: 0.55,
      ridgeShare: 0.75,
      shelfFactor: 1.9,
      warpFactor: 1.7,
      modulationShare: 0.5,
      chuteCount: 5,
      chuteStrength: 1,
    },
  },
};

/** The base recipe shifted toward the thermal variant by `geologyCoupling`. */
export function regionShapeFor(
  type: GeologicalRegionType,
  thermal: HeatZoneClass,
  geologyCoupling: number
): RegionShape {
  const base = REGION_SHAPES[type];
  const variant = REGION_SHAPE_VARIANTS[type][thermal];
  if (!variant) {
    return base;
  }
  const coupling = clamp01(geologyCoupling);
  if (coupling === 0) {
    return base;
  }
  return shiftShape(base, variant, coupling);
}

function shiftShape(
  base: RegionShape,
  variant: RegionShapeOverride,
  coupling: number
): RegionShape {
  const blend = (from: number, to: number | undefined, integer = false): number => {
    if (to === undefined) {
      return from;
    }
    const value = from + (to - from) * coupling;
    return integer ? Math.round(value) : value;
  };
  const choose = <Value>(from: Value, to: Value | undefined): Value =>
    to === undefined || coupling < 0.5 ? from : to;

  return {
    coverageFactor: blend(base.coverageFactor, variant.coverageFactor),
    minForms: blend(base.minForms, variant.minForms, true),
    maxForms: blend(base.maxForms, variant.maxForms, true),
    amplitudeFactor: blend(base.amplitudeFactor, variant.amplitudeFactor),
    heightCurve: blend(base.heightCurve, variant.heightCurve),
    cliffShare: blend(base.cliffShare, variant.cliffShare),
    warpFactor: blend(base.warpFactor, variant.warpFactor),
    modulationShare: blend(base.modulationShare, variant.modulationShare),
    ridgeShare: blend(base.ridgeShare, variant.ridgeShare),
    shelfFactor: blend(base.shelfFactor, variant.shelfFactor),
    usesMountainousness: choose(base.usesMountainousness, variant.usesMountainousness),
    cavityShare: choose(base.cavityShare, variant.cavityShare),
    buildsReef: choose(base.buildsReef, variant.buildsReef),
    cavityRadiusShare: blend(base.cavityRadiusShare, variant.cavityRadiusShare),
    cavityFloorShare: choose(base.cavityFloorShare, variant.cavityFloorShare),
    chuteCount: blend(base.chuteCount, variant.chuteCount, true),
    chuteStrength: blend(base.chuteStrength, variant.chuteStrength),
    oceanFloorShare: blend(base.oceanFloorShare, variant.oceanFloorShare),
  };
}

import { PROVENANCE_OUTSIDE } from './defaults';
import { dominantAreaId } from './merge';
import { createProvenanceIndex } from './provenance';
import type { GeologicalAreaPlan, GeologyPlan, TerrainProfile } from '../../types';

const PROFILE: TerrainProfile = {
  elevation: 0.5,
  roughness: 0.5,
  mountainStrength: 0.5,
  hillStrength: 0.5,
  plateauStrength: 0.5,
  lakePotential: 0.5,
  erosionStrength: 0.5,
  coastalCliffStrength: 0.5,
};

function planArea(id: string): GeologicalAreaPlan {
  return {
    id,
    character: 'ordinary',
    centre: { x: 0.5, y: 0.5 },
    extent: 0.2,
    elongation: 0.3,
    direction: 0,
    upliftDensity: 0.5,
    upliftScaleMeters: 600,
    fragmentation: 0.4,
    seabedOffsetMeters: 0,
    shelfWidthMeters: 400,
    rimStrength: 0,
    reefSites: [],
    relief: 'plains',
    profile: PROFILE,
  };
}

describe('createProvenanceIndex', () => {
  it('maps every area id to its plan position', () => {
    const plan: GeologyPlan = {
      areas: [planArea('alpha'), planArea('beta'), planArea('gamma')],
    };
    const index = createProvenanceIndex(plan);
    expect(index.get('alpha')).toBe(0);
    expect(index.get('beta')).toBe(1);
    expect(index.get('gamma')).toBe(2);
  });

  it('turns a dominant area id into the index written to the provenance map', () => {
    const plan: GeologyPlan = { areas: [planArea('alpha'), planArea('beta')] };
    const index = createProvenanceIndex(plan);
    const dominant = dominantAreaId([
      { areaId: 'alpha', heightMeters: 10 },
      { areaId: 'beta', heightMeters: 80 },
    ]);
    expect(dominant).toBe('beta');
    expect(dominant ? index.get(dominant) : PROVENANCE_OUTSIDE).toBe(1);
  });

  it('leaves unknown ids to the caller, which writes PROVENANCE_OUTSIDE', () => {
    const index = createProvenanceIndex({ areas: [planArea('alpha')] });
    expect(index.get('missing')).toBeUndefined();
    expect(PROVENANCE_OUTSIDE).toBe(-1);
  });
});

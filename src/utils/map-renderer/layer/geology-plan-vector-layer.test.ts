import { GeologyPlanVectorLayer, geologyPlanVectorLayerFactory } from './geology-plan-vector-layer';
import type { GeologicalAreaPlan, GeologyPlan, TerrainProfile } from '../../map-generator/types';
import type { RenderTarget } from '../preview-targets';
import type { SpatialMask } from '../types';

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

function area(overrides: Partial<GeologicalAreaPlan> = {}): GeologicalAreaPlan {
  return {
    id: 'area-1',
    centre: { x: 0.5, y: 0.5 },
    extent: 0.2,
    elongation: 0,
    direction: 0,
    upliftDensity: 0.5,
    upliftScaleMeters: 600,
    fragmentation: 0.4,
    seabedOffsetMeters: 0,
    shelfWidthMeters: 0,
    rimStrength: 0,
    relief: 'plains',
    profile: PROFILE,
    ...overrides,
  };
}

const plan: GeologyPlan = { areas: [area({ rimStrength: 0.8 })] };

function targetFor(width: number, height: number): RenderTarget {
  return { width, height, projection: { cellSize: 1, left: 0, top: 0, width, height } };
}

function mockCanvas(): {
  calls: { ellipse: unknown[][]; clip: number };
  restore: () => void;
} {
  const calls = { ellipse: [] as unknown[][], clip: 0 };
  const spy = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
    beginPath: vi.fn(),
    ellipse: (...args: unknown[]) => calls.ellipse.push(args),
    fill: vi.fn(),
    stroke: vi.fn(),
    setLineDash: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    clip: () => {
      calls.clip += 1;
    },
    drawImage: vi.fn(),
  } as unknown as CanvasRenderingContext2D);
  return { calls, restore: () => spy.mockRestore() };
}

describe('GeologyPlanVectorLayer', () => {
  it('returns the area under the cell and nothing outside its influence', () => {
    const layer = new GeologyPlanVectorLayer('geology', { width: 11, height: 11 }, plan);
    try {
      expect(layer.sample(5, 5)).toEqual({ id: 'area-1' });
      expect(layer.sample(0, 0)).toBeUndefined();
      expect(layer.sample(10, 0)).toBeUndefined();
    } finally {
      layer.dispose();
    }
  });

  it('ignores areas outside the world mask', () => {
    const mask: SpatialMask = { size: { width: 11, height: 11 }, contains: x => x >= 5 };
    const layer = new GeologyPlanVectorLayer('geology', { width: 11, height: 11 }, plan, { mask });

    try {
      expect(layer.sample(5, 5)).toEqual({ id: 'area-1' });
      expect(layer.sample(4, 5)).toBeUndefined();
    } finally {
      layer.dispose();
    }
  });

  it('paints the influence and the lagoon rim of an atoll area', async () => {
    const { calls, restore } = mockCanvas();
    const layer = new GeologyPlanVectorLayer('geology', { width: 11, height: 11 }, plan);

    try {
      await layer.prepare(new AbortController().signal, targetFor(11, 11));

      expect(calls.ellipse.length).toBeGreaterThanOrEqual(2);
      expect(layer.statistics).toMatchObject({ nodes: 1 });
    } finally {
      layer.dispose();
      restore();
    }
  });

  it('clips the painted influence to the world outline', async () => {
    const { calls, restore } = mockCanvas();
    const layer = new GeologyPlanVectorLayer('geology', { width: 11, height: 11 }, plan, {
      shape: 'disc',
    });

    try {
      await layer.prepare(new AbortController().signal, targetFor(11, 11));

      expect(calls.clip).toBeGreaterThan(0);
      expect(calls.ellipse.length).toBeGreaterThanOrEqual(2);
    } finally {
      layer.dispose();
      restore();
    }
  });

  it('validates the domain data before building the layer', () => {
    expect(geologyPlanVectorLayerFactory.supports(plan)).toBe(true);
    expect(geologyPlanVectorLayerFactory.supports({ areas: 'nope' })).toBe(false);

    const layer = geologyPlanVectorLayerFactory.create({
      id: 'geology',
      size: { width: 4, height: 4 },
      value: plan,
      info: {},
    });

    try {
      expect(layer).toBeInstanceOf(GeologyPlanVectorLayer);
      expect(layer.id).toBe('geology');
    } finally {
      layer.dispose();
    }
  });
});

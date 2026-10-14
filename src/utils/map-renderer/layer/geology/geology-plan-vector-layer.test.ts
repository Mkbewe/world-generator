import { GeologyPlanVectorLayer, geologyPlanVectorLayerFactory } from './geology-plan-vector-layer';
import type { GeologyPlan } from '../../../map-generator/types';
import type { RenderTarget } from '../../preview-targets';
import type { SpatialMask } from '../../types';

const PLAN: GeologyPlan = {
  regions: [
    {
      id: 'region-1',
      centre: { x: 0.25, y: 0.5 },
      weight: 1,
      type: 'ordinary',
      areaSquareMeters: 100,
    },
    {
      id: 'region-2',
      centre: { x: 0.75, y: 0.5 },
      weight: 1,
      type: 'volcanic',
      areaSquareMeters: 100,
    },
  ],
  regionRasterSize: { width: 2, height: 1 },
  regionOwnerMap: new Int16Array([0, 1]),
  regionBorderDistanceMap: new Float32Array([100, 100]),
  worldAreaSquareMeters: 400,
};

function target(): RenderTarget {
  return { width: 2, height: 1, projection: { cellSize: 1, left: 0, top: 0, width: 2, height: 1 } };
}

describe('GeologyPlanVectorLayer', () => {
  it('samples the owner raster as region ids', () => {
    const layer = new GeologyPlanVectorLayer('geology', { width: 2, height: 1 }, PLAN);
    try {
      expect(layer.sample(0, 0)).toEqual({ id: 'region-1' });
      expect(layer.sample(1, 0)).toEqual({ id: 'region-2' });
    } finally {
      layer.dispose();
    }
  });

  it('respects the world mask when sampling', () => {
    const mask: SpatialMask = { size: { width: 2, height: 1 }, contains: x => x > 0 };
    const layer = new GeologyPlanVectorLayer('geology', { width: 2, height: 1 }, PLAN, { mask });
    try {
      expect(layer.sample(0, 0)).toBeUndefined();
      expect(layer.sample(1, 0)).toEqual({ id: 'region-2' });
    } finally {
      layer.dispose();
    }
  });

  it('accepts region data in the layer factory', () => {
    expect(geologyPlanVectorLayerFactory.supports(PLAN)).toBe(true);
    expect(geologyPlanVectorLayerFactory.supports({ areas: [] })).toBe(false);
    const layer = geologyPlanVectorLayerFactory.create({
      id: 'geology',
      size: { width: 2, height: 1 },
      value: PLAN,
      info: {},
    });
    try {
      expect(layer).toBeInstanceOf(GeologyPlanVectorLayer);
    } finally {
      layer.dispose();
    }
  });

  it('composes an opaque world surface and marks the anchor icons', async () => {
    const images: Uint8ClampedArray[] = [];
    const stroke = vi.fn();
    const context = {
      drawImage: vi.fn(),
      createImageData: (width: number, height: number) => ({
        width,
        height,
        data: new Uint8ClampedArray(width * height * 4),
      }),
      putImageData: (image: ImageData) => images.push(image.data),
      save: vi.fn(),
      restore: vi.fn(),
      fillText: vi.fn(),
      strokeText: vi.fn(),
      beginPath: vi.fn(),
      closePath: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      quadraticCurveTo: vi.fn(),
      stroke,
    };
    const canvas = vi
      .spyOn(HTMLCanvasElement.prototype, 'getContext')
      .mockReturnValue(context as unknown as CanvasRenderingContext2D);
    const layer = new GeologyPlanVectorLayer('geology', { width: 2, height: 1 }, PLAN);
    try {
      await layer.prepare(new AbortController().signal, target());
      expect(images.length).toBeGreaterThan(0);
      expect(images.every(image => image[3] === 255)).toBe(true);
      // Anchor outline, anchor body and type icon per region.
      expect(stroke).toHaveBeenCalledTimes(PLAN.regions.length * 3);
    } finally {
      layer.dispose();
      canvas.mockRestore();
    }
  });
});

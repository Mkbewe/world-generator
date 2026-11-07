import { OceanCurrentLayer, oceanCurrentLayerFactory } from './ocean-current-layer';
import type { RenderTarget } from '../../preview-targets';
import type { SpatialMask } from '../../types';

const size = { width: 2, height: 1 };
const map = new Float32Array([0, Math.PI / 2]);
const strength = new Float32Array([0.5, 0.25]);

function target(): RenderTarget {
  return {
    width: 200,
    height: 100,
    projection: { cellSize: 100, left: 0, top: 0, width: 200, height: 100 },
  };
}

describe('OceanCurrentLayer', () => {
  it('samples direction and strength from the two rasters', () => {
    const mask: SpatialMask = { size, contains: () => true };
    const layer = new OceanCurrentLayer('ocean-currents', size, map, strength, mask);
    try {
      expect(layer.sample(0, 0)).toEqual({
        id: 'ocean-current',
        oceanCurrent: { angle: 0, strength: 0.5 },
      });
      expect(layer.sample(1, 0)).toEqual({
        id: 'ocean-current',
        oceanCurrent: { angle: Math.fround(Math.PI / 2), strength: 0.25 },
      });
      expect(layer.sample(2, 0)).toBeUndefined();
    } finally {
      layer.dispose();
    }
  });

  it('respects the world mask when sampling', () => {
    const mask: SpatialMask = { size, contains: x => x > 0 };
    const layer = new OceanCurrentLayer('ocean-currents', size, map, strength, mask);
    try {
      expect(layer.sample(0, 0)).toBeUndefined();
      expect(layer.sample(1, 0)).toEqual({
        id: 'ocean-current',
        oceanCurrent: { angle: Math.fround(Math.PI / 2), strength: 0.25 },
      });
    } finally {
      layer.dispose();
    }
  });

  it('accepts the paired rasters in the layer factory', () => {
    expect(oceanCurrentLayerFactory.supports(map)).toBe(true);
    expect(oceanCurrentLayerFactory.supports(new Uint8Array(2))).toBe(false);
    expect(() =>
      oceanCurrentLayerFactory.create({
        id: 'ocean-currents',
        size,
        value: map,
        info: {},
        data: {},
      })
    ).toThrow('strength');

    const layer = oceanCurrentLayerFactory.create({
      id: 'ocean-currents',
      size,
      value: map,
      info: {},
      data: { oceanCurrentStrength: strength },
      mask: { size, contains: () => true },
    });
    try {
      expect(layer).toBeInstanceOf(OceanCurrentLayer);
    } finally {
      layer.dispose();
    }
  });

  it('paints the backdrop and strokes the arrows twice per frame', async () => {
    const fillRect = vi.fn();
    const stroke = vi.fn();
    const context = {
      fillRect,
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke,
      drawImage: vi.fn(),
    } as unknown as CanvasRenderingContext2D;
    const canvas = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context);
    const layer = new OceanCurrentLayer('ocean-currents', size, map, strength, {
      size,
      contains: () => true,
    });
    try {
      await layer.prepare(new AbortController().signal, target());
      expect(fillRect).toHaveBeenCalledTimes(2);
      expect(stroke).toHaveBeenCalledTimes(4);
    } finally {
      layer.dispose();
      canvas.mockRestore();
    }
  });
});

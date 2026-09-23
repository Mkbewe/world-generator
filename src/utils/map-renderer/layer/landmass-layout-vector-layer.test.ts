import {
  LandmassLayoutVectorLayer,
  landmassLayoutVectorLayerFactory,
} from './landmass-layout-vector-layer';
import type { LandmassLayout } from '../../map-generator/types';
import type { RenderTarget } from '../preview-targets';

const layout: LandmassLayout = {
  structures: [
    {
      id: 'landmass-1',
      archetype: 'elongated',
      nodes: [
        { id: 'landmass-1-n1', position: { x: 0.4, y: 0.5 }, radius: 0.05 },
        { id: 'landmass-1-n2', position: { x: 0.6, y: 0.5 }, radius: 0.05 },
      ],
      edges: [{ id: 'landmass-1-e1', from: 'landmass-1-n1', to: 'landmass-1-n2' }],
      shelfId: 'shelf-1',
    },
  ],
  shelves: [{ id: 'shelf-1', width: 0.07, targetDepth: 0.35, falloff: 0.5, irregularity: 0.35 }],
};

function targetFor(width: number, height: number): RenderTarget {
  return { width, height, projection: { cellSize: 1, left: 0, top: 0, width, height } };
}

describe('LandmassLayoutVectorLayer', () => {
  it('returns the structure under the cell, or nothing for open sea', () => {
    const layer = new LandmassLayoutVectorLayer(
      'landmass-layout',
      { width: 11, height: 11 },
      layout
    );
    try {
      expect(layer.sample(5, 5)).toEqual({ id: 'landmass-1' });
      expect(layer.sample(4, 5)).toEqual({ id: 'landmass-1' });
      expect(layer.sample(0, 0)).toBeUndefined();
      expect(layer.sample(10, 5)).toBeUndefined();
    } finally {
      layer.dispose();
    }
  });

  it('reports nodes and edges instead of pixels', async () => {
    const getContext = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      createImageData: (width: number, height: number) => ({
        data: new Uint8ClampedArray(width * height * 4),
      }),
      putImageData: vi.fn(),
      drawImage: vi.fn(),
    } as unknown as CanvasRenderingContext2D);
    const layer = new LandmassLayoutVectorLayer('landmass-layout', { width: 4, height: 4 }, layout);
    try {
      await layer.prepare(new AbortController().signal, targetFor(4, 4));
      expect(layer.statistics).toMatchObject({ nodes: 2, edges: 1 });
    } finally {
      layer.dispose();
      getContext.mockRestore();
    }
  });

  it('validates the domain data before building the layer', () => {
    expect(landmassLayoutVectorLayerFactory.supports(layout)).toBe(true);
    expect(landmassLayoutVectorLayerFactory.supports({ structures: 'nope' })).toBe(false);

    const layer = landmassLayoutVectorLayerFactory.create({
      id: 'landmass-layout',
      size: { width: 4, height: 4 },
      value: layout,
    });
    try {
      expect(layer).toBeInstanceOf(LandmassLayoutVectorLayer);
      expect(layer.id).toBe('landmass-layout');
      expect(layer.size).toEqual({ width: 4, height: 4 });
    } finally {
      layer.dispose();
    }
    expect(() =>
      landmassLayoutVectorLayerFactory.create({
        id: 'landmass-layout',
        size: { width: 4, height: 4 },
        value: { structures: 'nope' },
      })
    ).toThrow('Invalid landmass layout data');
  });
});

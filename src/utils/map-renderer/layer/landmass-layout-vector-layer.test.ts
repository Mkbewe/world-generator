import {
  LandmassLayoutVectorLayer,
  landmassLayoutVectorLayerFactory,
} from './landmass-layout-vector-layer';
import { OCEAN_MARGIN_METERS } from '../../map-generator/stages/landmass';
import type { LandmassLayout } from '../../map-generator/types';
import type { RenderTarget } from '../preview-targets';
import type { SpatialMask } from '../types';

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

interface CanvasCalls {
  readonly ellipse: unknown[][];
  readonly arc: unknown[][];
  readonly stroke: unknown[][];
}

function mockCanvas(): { calls: CanvasCalls; restore: () => void } {
  const calls: CanvasCalls = { ellipse: [], arc: [], stroke: [] };
  const record =
    (bucket: unknown[][]) =>
    (...args: unknown[]) => {
      bucket.push(args);
    };
  const spy = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
    createImageData: (width: number, height: number) => ({
      data: new Uint8ClampedArray(width * height * 4),
    }),
    putImageData: vi.fn(),
    drawImage: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    beginPath: vi.fn(),
    closePath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    bezierCurveTo: vi.fn(),
    arc: record(calls.arc),
    ellipse: record(calls.ellipse),
    rect: vi.fn(),
    clip: vi.fn(),
    fill: vi.fn(),
    stroke: record(calls.stroke),
  } as unknown as CanvasRenderingContext2D);
  return { calls, restore: () => spy.mockRestore() };
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

  it('ignores structures outside the world mask', () => {
    const mask: SpatialMask = { size: { width: 11, height: 11 }, contains: x => x >= 5 };
    const layer = new LandmassLayoutVectorLayer(
      'landmass-layout',
      { width: 11, height: 11 },
      layout,
      { mask }
    );
    try {
      expect(layer.sample(5, 5)).toEqual({ id: 'landmass-1' });
      expect(layer.sample(4, 5)).toBeUndefined();
    } finally {
      layer.dispose();
    }
  });

  it('paints the ocean background, the wireframe and the skeleton', async () => {
    const { calls, restore } = mockCanvas();
    const layer = new LandmassLayoutVectorLayer(
      'landmass-layout',
      { width: 11, height: 11 },
      layout,
      { shape: 'disc' }
    );
    try {
      await layer.prepare(new AbortController().signal, targetFor(11, 11));

      expect(calls.ellipse.length).toBeGreaterThanOrEqual(1);
      // One dot per real node in one drawing.
      expect(calls.arc.length).toBeGreaterThanOrEqual(2);
      // Two side rails, one width stroke and the skeleton per edge.
      expect(calls.stroke.length).toBeGreaterThanOrEqual(4);
      expect(layer.statistics).toMatchObject({ nodes: 2, edges: 1 });
    } finally {
      layer.dispose();
      restore();
    }
  });

  it('paints rounded end caps without a world outline', async () => {
    const { calls, restore } = mockCanvas();
    const layer = new LandmassLayoutVectorLayer('landmass-layout', { width: 4, height: 4 }, layout);
    try {
      await layer.prepare(new AbortController().signal, targetFor(4, 4));

      expect(calls.ellipse.length).toBeGreaterThanOrEqual(2);
    } finally {
      layer.dispose();
      restore();
    }
  });

  it('validates the domain data before building the layer', () => {
    expect(landmassLayoutVectorLayerFactory.supports(layout)).toBe(true);
    expect(landmassLayoutVectorLayerFactory.supports({ structures: 'nope' })).toBe(false);

    const layer = landmassLayoutVectorLayerFactory.create({
      id: 'landmass-layout',
      size: { width: 4, height: 4 },
      value: layout,
      info: {},
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
        info: {},
      })
    ).toThrow('Invalid landmass layout data');
  });

  it('clips painting to the ocean margin when the physical size is known', async () => {
    const { calls, restore } = mockCanvas();
    const layer = new LandmassLayoutVectorLayer(
      'landmass-layout',
      { width: 11, height: 11 },
      layout,
      { shape: 'disc', dimensionsMeters: { widthMeters: 1100, heightMeters: 1100 } }
    );
    try {
      await layer.prepare(new AbortController().signal, targetFor(11, 11));

      // Base radius 5 eroded by the ocean margin: its share of the 10-cell span.
      const eroded = calls.ellipse.find(call => (call[2] as number) < 5);
      expect(eroded?.[2]).toBeCloseTo(5 - (OCEAN_MARGIN_METERS / 1100) * 10, 10);
      expect(eroded?.[3]).toBeCloseTo(5 - (OCEAN_MARGIN_METERS / 1100) * 10, 10);
    } finally {
      layer.dispose();
      restore();
    }
  });

  it('ignores hits in the ocean margin but keeps them without meters', () => {
    const edgeLayout: LandmassLayout = {
      structures: [
        {
          id: 'landmass-1',
          archetype: 'elongated',
          nodes: [
            { id: 'landmass-1-n1', position: { x: 0.9, y: 0.5 }, radius: 0.05 },
            { id: 'landmass-1-n2', position: { x: 0.95, y: 0.5 }, radius: 0.08 },
          ],
          edges: [{ id: 'landmass-1-e1', from: 'landmass-1-n1', to: 'landmass-1-n2' }],
          shelfId: 'shelf-1',
        },
      ],
      shelves: [],
    };
    const edge = new LandmassLayoutVectorLayer(
      'landmass-layout',
      { width: 11, height: 11 },
      edgeLayout,
      {
        shape: 'disc',
        dimensionsMeters: { widthMeters: 1100, heightMeters: 1100 },
      }
    );
    const plain = new LandmassLayoutVectorLayer(
      'landmass-layout',
      { width: 11, height: 11 },
      edgeLayout,
      { shape: 'disc' }
    );
    try {
      // Cell (10, 5) sits on the rim inside the world but outside the margin.
      expect(edge.sample(10, 5)).toBeUndefined();
      expect(plain.sample(10, 5)).toEqual({ id: 'landmass-1' });
    } finally {
      edge.dispose();
      plain.dispose();
    }
  });
});

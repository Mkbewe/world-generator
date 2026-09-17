import { WorldBoundaryRenderer } from './world-boundary-renderer';
import { LAYER_CATALOG } from '../../map-layers';
import { CatalogLayer } from '../layer';

function createContext(extra: Record<string, unknown> = {}): CanvasRenderingContext2D {
  return {
    beginPath: vi.fn(),
    arc: vi.fn(),
    rect: vi.fn(),
    stroke: vi.fn(),
    createImageData: vi.fn(),
    putImageData: vi.fn(),
    ...extra,
  } as unknown as CanvasRenderingContext2D;
}

function createCanvas(context: CanvasRenderingContext2D): HTMLCanvasElement {
  return {
    width: 0,
    height: 0,
    getContext: vi.fn(() => context),
  } as unknown as HTMLCanvasElement;
}

function createWorld(): CatalogLayer {
  return new CatalogLayer(LAYER_CATALOG[0], { width: 4, height: 4 }, new Uint8Array(16).fill(1));
}

const VIEWPORT = { width: 4, height: 4, devicePixelRatio: 3 };

describe('WorldBoundaryRenderer', () => {
  it('strokes a disc at display resolution with capped pixel ratio', () => {
    const context = createContext();
    const canvas = createCanvas(context);
    const world = createWorld();

    new WorldBoundaryRenderer(canvas).render(world, VIEWPORT, 'disc');
    world.dispose();

    expect(canvas.width).toBe(8);
    expect(canvas.height).toBe(8);
    expect(context.arc).toHaveBeenCalledWith(4, 4, 2, 0, Math.PI * 2);
    expect(context.stroke).toHaveBeenCalledOnce();
    expect(context.lineWidth).toBe(4);
    expect(context.strokeStyle).toBe('rgba(100, 255, 218, 0.9)');
  });

  it('strokes a rectangle inset by half the line width', () => {
    const context = createContext();
    const canvas = createCanvas(context);
    const world = createWorld();

    new WorldBoundaryRenderer(canvas).render(world, VIEWPORT, 'rectangle');
    world.dispose();

    expect(context.rect).toHaveBeenCalledWith(2, 2, 4, 4);
    expect(context.stroke).toHaveBeenCalledOnce();
  });

  it('traces the mask cells when the world shape is unknown', () => {
    const data = new Uint8ClampedArray(8 * 8 * 4);
    const context = createContext({
      createImageData: vi.fn(() => ({ data, width: 8, height: 8 })),
    });
    const canvas = createCanvas(context);
    const world = createWorld();

    new WorldBoundaryRenderer(canvas).render(world, VIEWPORT);
    world.dispose();

    expect(context.putImageData).toHaveBeenCalledOnce();
    expect(data.some(value => value === 230)).toBe(true);
  });
});

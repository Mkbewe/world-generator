import { WorldBoundaryRenderer } from './world-boundary-renderer';
import { LAYER_CATALOG } from '../../map-layers';
import { CatalogLayer } from '../layer';
import { fitView } from '../view/view-transform';

function createContext(): CanvasRenderingContext2D {
  return {
    beginPath: vi.fn(),
    ellipse: vi.fn(),
    rect: vi.fn(),
    stroke: vi.fn(),
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

    new WorldBoundaryRenderer(canvas).render(world, VIEWPORT, 'disc', fitView());
    world.dispose();

    expect(canvas.width).toBe(8);
    expect(canvas.height).toBe(8);
    expect(context.ellipse).toHaveBeenCalledWith(4, 4, 3, 3, 0, 0, Math.PI * 2);
    expect(context.stroke).toHaveBeenCalledOnce();
    expect(context.lineWidth).toBe(6);
    expect(context.strokeStyle).toBe('rgba(49, 155, 0, 0.9)');
  });

  it('strokes a rectangle along the generated mask boundary', () => {
    const context = createContext();
    const canvas = createCanvas(context);
    const world = createWorld();

    new WorldBoundaryRenderer(canvas).render(world, VIEWPORT, 'rectangle', fitView());
    world.dispose();

    expect(context.rect).toHaveBeenCalledWith(1, 1, 6, 6);
    expect(context.stroke).toHaveBeenCalledOnce();
  });
});

import { renderMapLayers } from './map-layer-renderer';

describe('renderMapLayers', () => {
  it('renders a base layer and its boundary overlay', () => {
    const data = new Uint8ClampedArray(4 * 4 * 4);
    const context = {
      createImageData: vi.fn(() => ({ data })),
      putImageData: vi.fn(),
    } as unknown as CanvasRenderingContext2D;
    const canvas = {
      width: 4,
      height: 4,
      getContext: vi.fn(() => context),
    } as unknown as HTMLCanvasElement;

    renderMapLayers(
      canvas,
      { worldMask: new Uint8Array([0, 0, 0, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 0, 0, 0]) },
      'world-shape',
      ['world-boundary']
    );

    expect(context.putImageData).toHaveBeenCalledOnce();
    expect(data[5 * 4 + 3]).toBe(230);
  });
});

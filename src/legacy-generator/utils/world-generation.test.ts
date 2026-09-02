import { afterEach, beforeEach, describe, expect, vi } from 'vitest';

import { generateWorldMap, generateWorldPixels } from './world-generation';

describe('generateWorldMap', () => {
  beforeEach(() => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      createImageData: (width: number, height: number) => ({
        data: new Uint8ClampedArray(width * height * 4),
      }),
      putImageData: vi.fn(),
    } as unknown as CanvasRenderingContext2D);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should generate world map without errors', () => {
    const mockCanvas = document.createElement('canvas');
    mockCanvas.width = 600;
    mockCanvas.height = 600;

    const mockParams = {
      largeCount: 3,
      mediumCount: 5,
      smallCount: 10,
      islandSize: 100,
      groupChance: 40,
      seaLevel: 0.38,
      roughness: 100,
      seed: '12345',
    };

    expect(() => generateWorldMap(mockCanvas, mockParams)).not.toThrow();
  });

  it('generates a deterministic pixel buffer for a fixed seed', () => {
    const params = {
      largeCount: 1,
      mediumCount: 1,
      smallCount: 1,
      islandSize: 100,
      groupChance: 40,
      seaLevel: 0.38,
      roughness: 100,
      seed: '12345',
    };

    const first = generateWorldPixels(20, 10, params);
    const second = generateWorldPixels(20, 10, params);

    expect(first.pixels).toHaveLength(20 * 10 * 4);
    expect(first.pixels).toEqual(second.pixels);
    expect(first.seed).toBe('12345');
  });
});

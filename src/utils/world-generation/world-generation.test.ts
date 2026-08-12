import { describe, expect } from 'vitest';

import { generateWorldMap, generateWorldPixels } from './world-generation';

describe('generateWorldMap', () => {
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

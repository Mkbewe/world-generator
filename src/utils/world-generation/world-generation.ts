import { createNoise2D } from 'simplex-noise';

import type { IslandCenter, IslandPosition, Params } from '../../types/world.types';

export interface IslandCounts {
  large: number;
  medium: number;
  small: number;
}

export interface GeneratedWorldPixels {
  pixels: Uint8ClampedArray;
  seed: string;
  islandCounts: IslandCounts;
}

export function generateWorldPixels(
  width: number,
  height: number,
  params: Params
): GeneratedWorldPixels {
  const mapScale = Math.min(width, height) / 1200;
  const seed = params.seed ? parseInt(params.seed) : Math.floor(Math.random() * 1000000);

  let seedValue = seed;
  const seededRandom = (): number => {
    seedValue = (seedValue * 9301 + 49297) % 233280;
    return seedValue / 233280;
  };

  const noise2D = createNoise2D(seededRandom);
  const rawIslandPositions: IslandPosition[] = [];

  const clusterX = seededRandom() * width;
  const clusterY = seededRandom() * height;

  const checkCollision = (
    x: number,
    y: number,
    type: IslandPosition['type'],
    existingIslands: IslandPosition[]
  ): boolean => {
    const sizeModifier = params.islandSize / 100;
    let newRadius = 55 * mapScale;
    if (type === 'LARGE') {
      newRadius = 160 * mapScale;
    }
    if (type === 'MEDIUM') {
      newRadius = 110 * mapScale;
    }
    newRadius *= sizeModifier;

    for (const existing of existingIslands) {
      let existingRadius = 55 * mapScale;
      if (existing.type === 'LARGE') {
        existingRadius = 160 * mapScale;
      }
      if (existing.type === 'MEDIUM') {
        existingRadius = 110 * mapScale;
      }
      existingRadius *= sizeModifier;

      const dx = x - existing.x;
      const dy = y - existing.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const minDistance = newRadius + existingRadius + 15;

      if (distance < minDistance) {
        return true;
      }
    }
    return false;
  };

  const types: Array<{ type: IslandPosition['type']; count: number }> = [
    { type: 'LARGE', count: params.largeCount },
    { type: 'MEDIUM', count: params.mediumCount },
    { type: 'SMALL', count: params.smallCount },
  ];

  types.forEach(({ type, count }) => {
    const groupChance = params.groupChance / 100;

    for (let index = 0; index < count; index++) {
      let posX = 0;
      let posY = 0;
      let attempts = 0;
      const maxAttempts = 100;
      let validPosition = false;

      while (attempts < maxAttempts && !validPosition) {
        if (seededRandom() < groupChance) {
          const angle = seededRandom() * 2 * Math.PI;
          const distance = seededRandom() * (Math.min(width, height) * 0.32);
          posX = clusterX + Math.cos(angle) * distance;
          posY = clusterY + Math.sin(angle) * distance;
        } else {
          posX = seededRandom() * width;
          posY = seededRandom() * height;
        }

        posX = Math.min(width - 1, Math.max(0, posX));
        posY = Math.min(height - 1, Math.max(0, posY));

        if (!checkCollision(posX, posY, type, rawIslandPositions)) {
          validPosition = true;
        }
        attempts++;
      }

      if (validPosition) {
        rawIslandPositions.push({ x: posX, y: posY, type });
      }
    }
  });

  const sizeModifier = params.islandSize / 100;
  const islandCenters: IslandCenter[] = rawIslandPositions.map(position => {
    let radius = 55 * mapScale;
    let boost = 0.5;
    if (position.type === 'LARGE') {
      radius = 160 * mapScale;
      boost = 0.75;
    }
    if (position.type === 'MEDIUM') {
      radius = 110 * mapScale;
      boost = 0.6;
    }
    return {
      x: position.x,
      y: position.y,
      radius: radius * sizeModifier,
      boost,
    };
  });

  const getCircularWorldMask = (x: number, y: number): number => {
    const normalizedX = (2 * x) / width - 1;
    const normalizedY = (2 * y) / height - 1;
    const distance = Math.sqrt(normalizedX * normalizedX + normalizedY * normalizedY);
    if (distance >= 0.98) {
      return 0;
    }
    return Math.pow(1 - distance, 0.25);
  };

  const getIslandBaseElevation = (x: number, y: number): number => {
    let closestIsland: IslandCenter | null = null;
    let minDistance = Infinity;

    for (const island of islandCenters) {
      const dx = x - island.x;
      const dy = y - island.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < island.radius && distance < minDistance) {
        minDistance = distance;
        closestIsland = island;
      }
    }

    if (closestIsland) {
      const influence = (1 + Math.cos((minDistance / closestIsland.radius) * Math.PI)) / 2;
      return influence * closestIsland.boost;
    }

    return 0;
  };

  const getHeight = (x: number, y: number): number => {
    const worldMask = getCircularWorldMask(x, y);
    if (worldMask === 0) {
      return 0;
    }

    const baseIsland = getIslandBaseElevation(x, y);
    const roughnessModifier = params.roughness / 100;
    const firstScale = 0.05 * roughnessModifier;
    const secondScale = 0.18 * roughnessModifier;
    const firstNoise = noise2D(x * firstScale, y * firstScale);
    const secondNoise = noise2D(x * secondScale, y * secondScale);
    const noise = ((1.0 * firstNoise + 0.35 * secondNoise) / 1.35 + 1) / 2;
    const finalElevation = baseIsland > 0 ? baseIsland * 0.55 + noise * 0.45 : noise * 0.2;

    return finalElevation * worldMask;
  };

  const getColor = (elevation: number): readonly [number, number, number] => {
    const sea = params.seaLevel;

    if (elevation <= 0.0) {
      return [9, 37, 96];
    }
    if (elevation < sea) {
      return [16, 64, 160];
    }
    if (elevation < sea + 0.03) {
      return [32, 96, 192];
    }
    if (elevation < sea + 0.06) {
      return [224, 205, 144];
    }
    if (elevation < sea + 0.16) {
      return [77, 144, 48];
    }
    if (elevation < sea + 0.3) {
      return [42, 96, 16];
    }
    if (elevation < sea + 0.42) {
      return [106, 112, 101];
    }
    return [255, 255, 255];
  };

  const pixels = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const elevation = getHeight(x, y);
      const [red, green, blue] = getColor(elevation);
      const pixelIndex = (y * width + x) * 4;
      pixels[pixelIndex] = red;
      pixels[pixelIndex + 1] = green;
      pixels[pixelIndex + 2] = blue;
      pixels[pixelIndex + 3] = 255;
    }
  }

  return {
    pixels,
    seed: seed.toString(),
    islandCounts: {
      large: rawIslandPositions.filter(island => island.type === 'LARGE').length,
      medium: rawIslandPositions.filter(island => island.type === 'MEDIUM').length,
      small: rawIslandPositions.filter(island => island.type === 'SMALL').length,
    },
  };
}

export function drawWorldPixels(canvas: HTMLCanvasElement, pixels: Uint8ClampedArray): void {
  const context = canvas.getContext('2d');
  if (!context) {
    return;
  }

  const imageData = context.createImageData(canvas.width, canvas.height);
  imageData.data.set(pixels);
  context.putImageData(imageData, 0, 0);
}

export function generateWorldMap(
  canvas: HTMLCanvasElement,
  params: Params,
  onSeedGenerated?: (seed: string) => void
): void {
  const result = generateWorldPixels(canvas.width, canvas.height, params);
  drawWorldPixels(canvas, result.pixels);

  if (!params.seed) {
    onSeedGenerated?.(result.seed);
  }
}

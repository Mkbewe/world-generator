import { createNoise2D } from 'simplex-noise';

import type { IslandCenter, IslandPosition, Params } from '../types/world.types';

export function generateWorldMap(
  canvas: HTMLCanvasElement,
  params: Params,
  onSeedGenerated?: (seed: string) => void
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return;
  }

  const width = canvas.width;
  const height = canvas.height;
  const center = width / 2;

  const seed = params.seed ? parseInt(params.seed) : Math.floor(Math.random() * 1000000);
  if (!params.seed && onSeedGenerated) {
    onSeedGenerated(seed.toString());
  }

  let seedValue = seed;
  const seededRandom = (): number => {
    seedValue = (seedValue * 9301 + 49297) % 233280;
    return seedValue / 233280;
  };

  const noise2D = createNoise2D(seededRandom);
  const rawIslandPositions: IslandPosition[] = [];

  const clusterAngle = seededRandom() * 2 * Math.PI;
  const clusterDist = seededRandom() * 100;
  const clusterX = center + Math.cos(clusterAngle) * clusterDist;
  const clusterY = center + Math.sin(clusterAngle) * clusterDist;

  const checkCollision = (
    x: number,
    y: number,
    type: IslandPosition['type'],
    existingIslands: IslandPosition[]
  ): boolean => {
    let newRadius = 25;
    if (type === 'LARGE') {
      newRadius = 80;
    }
    if (type === 'MEDIUM') {
      newRadius = 56;
    }

    const sizeModifier = params.islandSize / 100;
    newRadius *= sizeModifier;

    for (const existing of existingIslands) {
      let existingRadius = 25;
      if (existing.type === 'LARGE') {
        existingRadius = 80;
      }
      if (existing.type === 'MEDIUM') {
        existingRadius = 56;
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

  types.forEach(t => {
    const groupChance = params.groupChance / 100;

    for (let i = 0; i < t.count; i++) {
      let posX: number = 0,
        posY: number = 0;
      let attempts = 0;
      const maxAttempts = 100;
      let validPosition = false;

      while (attempts < maxAttempts && !validPosition) {
        if (seededRandom() < groupChance) {
          const angle = seededRandom() * 2 * Math.PI;
          const dist = seededRandom() * 130;
          posX = clusterX + Math.cos(angle) * dist;
          posY = clusterY + Math.sin(angle) * dist;
        } else {
          const angle = seededRandom() * 2 * Math.PI;
          const dist = seededRandom() * 220;
          posX = center + Math.cos(angle) * dist;
          posY = center + Math.sin(angle) * dist;
        }

        if (!checkCollision(posX, posY, t.type, rawIslandPositions)) {
          validPosition = true;
        }
        attempts++;
      }

      if (validPosition) {
        rawIslandPositions.push({ x: posX, y: posY, type: t.type });
      }
    }
  });

  const sizeModifier = params.islandSize / 100;
  const islandCenters: IslandCenter[] = rawIslandPositions.map(p => {
    let rad = 25;
    let bst = 0.5;
    if (p.type === 'LARGE') {
      rad = 80;
      bst = 0.75;
    }
    if (p.type === 'MEDIUM') {
      rad = 56;
      bst = 0.6;
    }
    return { x: p.x, y: p.y, radius: rad * sizeModifier, boost: bst };
  });

  const largeCount = rawIslandPositions.filter(i => i.type === 'LARGE').length;
  const mediumCount = rawIslandPositions.filter(i => i.type === 'MEDIUM').length;
  const smallCount = rawIslandPositions.filter(i => i.type === 'SMALL').length;
  console.log(
    `Wygenerowano: ${largeCount} dużych, ${mediumCount} średnich, ${smallCount} małych (razem: ${rawIslandPositions.length})`
  );

  const getCircularWorldMask = (x: number, y: number): number => {
    const nx = (2 * x) / width - 1;
    const ny = (2 * y) / height - 1;
    const distance = Math.sqrt(nx * nx + ny * ny);
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

    const roughMod = params.roughness / 100;
    const scale1 = 0.05 * roughMod;
    const scale2 = 0.18 * roughMod;

    const e1 = noise2D(x * scale1, y * scale1);
    const e2 = noise2D(x * scale2, y * scale2);
    let noise = (1.0 * e1 + 0.35 * e2) / 1.35;
    noise = (noise + 1) / 2;

    let finalElevation = 0;
    if (baseIsland > 0) {
      finalElevation = baseIsland * 0.55 + noise * 0.45;
    } else {
      finalElevation = noise * 0.2;
    }

    return finalElevation * worldMask;
  };

  const getColor = (elevation: number): string => {
    const sea = params.seaLevel;

    if (elevation <= 0.0) {
      return '#092560';
    }
    if (elevation < sea) {
      return '#1040a0';
    }
    if (elevation < sea + 0.03) {
      return '#2060c0';
    }
    if (elevation < sea + 0.06) {
      return '#e0cd90';
    }
    if (elevation < sea + 0.16) {
      return '#4d9030';
    }
    if (elevation < sea + 0.3) {
      return '#2a6010';
    }
    if (elevation < sea + 0.42) {
      return '#6a7065';
    }
    return '#ffffff';
  };

  const imgData = ctx.createImageData(width, height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const elevation = getHeight(x, y);
      const colorHex = getColor(elevation);
      const r = parseInt(colorHex.slice(1, 3), 16);
      const g = parseInt(colorHex.slice(3, 5), 16);
      const b = parseInt(colorHex.slice(5, 7), 16);
      const index = (y * width + x) * 4;
      imgData.data[index] = r;
      imgData.data[index + 1] = g;
      imgData.data[index + 2] = b;
      imgData.data[index + 3] = 255;
    }
  }
  ctx.putImageData(imgData, 0, 0);
}

import { useEffect, useRef, useState } from 'react';
import { createNoise2D } from 'simplex-noise';

import type { IslandCenter, IslandPosition, Params } from '../../types/island.types';
import styles from './island-generator.module.css';

export default function IslandGenerator() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [params, setParams] = useState<Params>({
    largeCount: 3,
    mediumCount: 5,
    smallCount: 10,
    islandSize: 100,
    groupChance: 40,
    seaLevel: 0.38,
    roughness: 100,
    seed: '',
  });

  // Seeded Random Generator
  let seedValue = 0;
  const seededRandom = (): number => {
    seedValue = (seedValue * 9301 + 49297) % 233280;
    return seedValue / 233280;
  };

  const setSeed = (seed: number): void => {
    seedValue = seed;
  };

  // Simplex Noise - tworzymy nową instancję z seeded random
  let noise2D = createNoise2D(seededRandom);

  let rawIslandPositions: IslandPosition[] = [];
  let islandCenters: IslandCenter[] = [];

  const updateParam = <K extends keyof Params>(key: K, value: Params[K]): void => {
    setParams(prev => ({ ...prev, [key]: value }));
  };

  const randomizeSeed = (): void => {
    const newSeed = Math.floor(Math.random() * 1000000);
    setParams(prev => ({ ...prev, seed: newSeed.toString() }));
  };

  const checkCollision = (
    x: number,
    y: number,
    type: IslandPosition['type'],
    existingIslands: IslandPosition[]
  ): boolean => {
    let newRadius = 25;
    if (type === 'LARGE') newRadius = 80;
    if (type === 'MEDIUM') newRadius = 56;

    let sizeModifier = params.islandSize / 100;
    newRadius *= sizeModifier;

    for (let existing of existingIslands) {
      let existingRadius = 25;
      if (existing.type === 'LARGE') existingRadius = 80;
      if (existing.type === 'MEDIUM') existingRadius = 56;
      existingRadius *= sizeModifier;

      let dx = x - existing.x;
      let dy = y - existing.y;
      let distance = Math.sqrt(dx * dx + dy * dy);
      let minDistance = newRadius + existingRadius + 15;

      if (distance < minDistance) {
        return true;
      }
    }
    return false;
  };

  const generateMap = (): void => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const center = width / 2;

    const seed = params.seed ? parseInt(params.seed) : Math.floor(Math.random() * 1000000);
    if (!params.seed) {
      setParams(prev => ({ ...prev, seed: seed.toString() }));
    }

    setSeed(seed);
    noise2D = createNoise2D(seededRandom); // Tworzymy nową instancję z nowym seedem
    rawIslandPositions = [];

    let clusterAngle = seededRandom() * 2 * Math.PI;
    let clusterDist = seededRandom() * 100;
    let clusterX = center + Math.cos(clusterAngle) * clusterDist;
    let clusterY = center + Math.sin(clusterAngle) * clusterDist;

    const types: Array<{ type: IslandPosition['type']; count: number }> = [
      { type: 'LARGE', count: params.largeCount },
      { type: 'MEDIUM', count: params.mediumCount },
      { type: 'SMALL', count: params.smallCount },
    ];

    types.forEach(t => {
      let groupChance = params.groupChance / 100;

      for (let i = 0; i < t.count; i++) {
        let posX: number = 0,
          posY: number = 0;
        let attempts = 0;
        let maxAttempts = 100;
        let validPosition = false;

        while (attempts < maxAttempts && !validPosition) {
          if (seededRandom() < groupChance) {
            let angle = seededRandom() * 2 * Math.PI;
            let dist = seededRandom() * 130;
            posX = clusterX + Math.cos(angle) * dist;
            posY = clusterY + Math.sin(angle) * dist;
          } else {
            let angle = seededRandom() * 2 * Math.PI;
            let dist = seededRandom() * 220;
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

    // Recalculate islands
    let sizeModifier = params.islandSize / 100;
    islandCenters = rawIslandPositions.map(p => {
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

    let largeCount = rawIslandPositions.filter(i => i.type === 'LARGE').length;
    let mediumCount = rawIslandPositions.filter(i => i.type === 'MEDIUM').length;
    let smallCount = rawIslandPositions.filter(i => i.type === 'SMALL').length;
    console.log(
      `Wygenerowano: ${largeCount} dużych, ${mediumCount} średnich, ${smallCount} małych (razem: ${rawIslandPositions.length})`
    );

    // Draw
    const getCircularWorldMask = (x: number, y: number): number => {
      let nx = (2 * x) / width - 1;
      let ny = (2 * y) / height - 1;
      let distance = Math.sqrt(nx * nx + ny * ny);
      if (distance >= 0.98) return 0;
      return Math.pow(1 - distance, 0.25);
    };

    const getIslandBaseElevation = (x: number, y: number): number => {
      let closestIsland: IslandCenter | null = null;
      let minDistance = Infinity;

      for (let island of islandCenters) {
        let dx = x - island.x;
        let dy = y - island.y;
        let distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < island.radius && distance < minDistance) {
          minDistance = distance;
          closestIsland = island;
        }
      }

      if (closestIsland) {
        let influence = (1 + Math.cos((minDistance / closestIsland.radius) * Math.PI)) / 2;
        return influence * closestIsland.boost;
      }

      return 0;
    };

    const getHeight = (x: number, y: number): number => {
      let worldMask = getCircularWorldMask(x, y);
      if (worldMask === 0) return 0;

      let baseIsland = getIslandBaseElevation(x, y);

      let roughMod = params.roughness / 100;
      let scale1 = 0.05 * roughMod;
      let scale2 = 0.18 * roughMod;

      let e1 = noise2D(x * scale1, y * scale1);
      let e2 = noise2D(x * scale2, y * scale2);
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
      let sea = params.seaLevel;

      if (elevation <= 0.0) return '#092560';
      if (elevation < sea) return '#1040a0';
      if (elevation < sea + 0.03) return '#2060c0';
      if (elevation < sea + 0.06) return '#e0cd90';
      if (elevation < sea + 0.16) return '#4d9030';
      if (elevation < sea + 0.3) return '#2a6010';
      if (elevation < sea + 0.42) return '#6a7065';
      return '#ffffff';
    };

    const imgData = ctx.createImageData(width, height);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let elevation = getHeight(x, y);
        let colorHex = getColor(elevation);
        let r = parseInt(colorHex.slice(1, 3), 16);
        let g = parseInt(colorHex.slice(3, 5), 16);
        let b = parseInt(colorHex.slice(5, 7), 16);
        let index = (y * width + x) * 4;
        imgData.data[index] = r;
        imgData.data[index + 1] = g;
        imgData.data[index + 2] = b;
        imgData.data[index + 3] = 255;
      }
    }
    ctx.putImageData(imgData, 0, 0);
  };

  useEffect(() => {
    randomizeSeed();
  }, []);

  useEffect(() => {
    if (params.seed) {
      generateMap();
    }
  }, []);

  return (
    <div className={styles.container}>
      <div className={styles.controls}>
        <h2 className={styles.title}>Ustawienia Świata</h2>

        <div className={styles.controlGroup}>
          <label className={styles.label}>
            Liczba dużych wysp: <span className={styles.labelValue}>{params.largeCount}</span>
          </label>
          <input
            type='range'
            className={styles.rangeInput}
            min='0'
            max='8'
            value={params.largeCount}
            onChange={e => updateParam('largeCount', parseInt(e.target.value))}
          />
        </div>

        <div className={styles.controlGroup}>
          <label className={styles.label}>
            Liczba średnich wysp: <span className={styles.labelValue}>{params.mediumCount}</span>
          </label>
          <input
            type='range'
            className={styles.rangeInput}
            min='0'
            max='15'
            value={params.mediumCount}
            onChange={e => updateParam('mediumCount', parseInt(e.target.value))}
          />
        </div>

        <div className={styles.controlGroup}>
          <label className={styles.label}>
            Liczba małych wysp: <span className={styles.labelValue}>{params.smallCount}</span>
          </label>
          <input
            type='range'
            className={styles.rangeInput}
            min='0'
            max='25'
            value={params.smallCount}
            onChange={e => updateParam('smallCount', parseInt(e.target.value))}
          />
        </div>

        <div className={styles.controlGroup}>
          <label className={styles.label}>
            Maks. rozmiar wysp: <span className={styles.labelValue}>{params.islandSize}%</span>
          </label>
          <input
            type='range'
            className={styles.rangeInput}
            min='50'
            max='150'
            value={params.islandSize}
            onChange={e => updateParam('islandSize', parseInt(e.target.value))}
          />
        </div>

        <div className={styles.controlGroup}>
          <label className={styles.label}>
            Szansa na zgrupowanie: <span className={styles.labelValue}>{params.groupChance}%</span>
          </label>
          <input
            type='range'
            className={styles.rangeInput}
            min='0'
            max='100'
            value={params.groupChance}
            onChange={e => updateParam('groupChance', parseInt(e.target.value))}
          />
        </div>

        <div className={styles.controlGroup}>
          <label className={styles.label}>
            Poziom morza (rozmiar plaż):{' '}
            <span className={styles.labelValue}>{params.seaLevel}</span>
          </label>
          <input
            type='range'
            className={styles.rangeInput}
            min='0.25'
            max='0.55'
            step='0.01'
            value={params.seaLevel}
            onChange={e => updateParam('seaLevel', parseFloat(e.target.value))}
          />
        </div>

        <div className={styles.controlGroup}>
          <label className={styles.label}>
            Poszarpanie brzegu (Szum):{' '}
            <span className={styles.labelValue}>{params.roughness}%</span>
          </label>
          <input
            type='range'
            className={styles.rangeInput}
            min='50'
            max='200'
            value={params.roughness}
            onChange={e => updateParam('roughness', parseInt(e.target.value))}
          />
        </div>

        <div className={styles.controlGroup}>
          <label className={styles.label}>Seed:</label>
          <div className={styles.seedInputContainer}>
            <input
              type='text'
              className={styles.seedInput}
              value={params.seed}
              onChange={e => updateParam('seed', e.target.value)}
            />
            <button onClick={randomizeSeed} className={`${styles.button} ${styles.seedButton}`}>
              Losuj
            </button>
          </div>
        </div>

        <button onClick={generateMap} className={styles.button}>
          Generate
        </button>
      </div>

      <div className={styles.canvasContainer}>
        <canvas ref={canvasRef} className={styles.canvas} width='600' height='600' />
      </div>
    </div>
  );
}

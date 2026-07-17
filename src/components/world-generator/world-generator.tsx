import { useRef, useState } from 'react';

import type { Params } from '../../types/world.types';
import { generateWorldMap } from '../../utils/world-generation';
import { WorldGeneratorForm } from '../world-generator-form';
import styles from './world-generator.module.css';

export function WorldGenerator() {
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

  const updateParam = <K extends keyof Params>(key: K, value: Params[K]): void => {
    setParams(prev => ({ ...prev, [key]: value }));
  };

  const handleGenerateMap = (): void => {
    if (!canvasRef.current) {
      return;
    }

    generateWorldMap(canvasRef.current, params, newSeed => {
      setParams(prev => ({ ...prev, seed: newSeed }));
    });
  };

  return (
    <div className={styles.container}>
      <WorldGeneratorForm
        params={params}
        updateParam={updateParam}
        generateMap={handleGenerateMap}
      />

      <div className={styles.canvasContainer}>
        <canvas ref={canvasRef} className={styles.canvas} width='600' height='600' />
      </div>
    </div>
  );
}

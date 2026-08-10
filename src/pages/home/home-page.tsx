import { useEffect, useRef, useState } from 'react';

import { useHeaderActions } from '../../components/header';
import { WorldCanvas, type WorldCanvasRef } from '../../components/world-canvas';
import { WorldControls } from '../../components/world-controls';
import { WorldGenerationPreview } from '../../components/world-generation-preview';
import { useFlag } from '../../feature-flags';
import type { Params } from '../../types/world.types';
import styles from './home-page.module.scss';

export function HomePage() {
  const worldCanvasRef = useRef<WorldCanvasRef>(null);
  const showPipelinePreview = useFlag('pipelinePreview');
  const { exportMapRef, setIsMapGenerated } = useHeaderActions();
  const [params, setParams] = useState<Params>({
    largeCount: 3,
    mediumCount: 5,
    smallCount: 10,
    islandSize: 100,
    groupChance: 40,
    seaLevel: 0.38,
    roughness: 50,
    seed: '',
  });

  useEffect(() => {
    exportMapRef.current = () => worldCanvasRef.current?.exportMap();
  }, [exportMapRef]);

  const updateParam = <K extends keyof Params>(key: K, value: Params[K]): void => {
    setParams(prev => ({ ...prev, [key]: value }));
  };

  const handleGenerateMap = (): void => {
    // eslint-disable-next-line no-console
    console.time('world-generation');
    worldCanvasRef.current?.generate();
    // eslint-disable-next-line no-console
    console.timeEnd('world-generation');
    setIsMapGenerated(true);
  };

  return (
    <div className={styles.container}>
      <WorldControls params={params} updateParam={updateParam} generateMap={handleGenerateMap} />

      <div className={styles.maps}>
        <WorldCanvas
          ref={worldCanvasRef}
          params={params}
          onSeedGenerated={newSeed => updateParam('seed', newSeed)}
        />
        {showPipelinePreview && <WorldGenerationPreview />}
      </div>
    </div>
  );
}

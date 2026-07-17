import { useEffect } from 'react';

import type { Params } from '../../types/world.types';
import styles from './world-generator-form.module.css';

interface WorldGeneratorFormProps {
  params: Params;
  updateParam: <K extends keyof Params>(key: K, value: Params[K]) => void;
  generateMap: () => void;
}

export function WorldGeneratorForm({ params, updateParam, generateMap }: WorldGeneratorFormProps) {
  const randomizeSeed = (): void => {
    const newSeed = Math.floor(Math.random() * 1000000);
    updateParam('seed', newSeed.toString());
  };

  useEffect(() => {
    randomizeSeed();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
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
          Poziom morza (rozmiar plaż): <span className={styles.labelValue}>{params.seaLevel}</span>
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
          Poszarpanie brzegu (Szum): <span className={styles.labelValue}>{params.roughness}%</span>
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
        <label htmlFor='seed-input' className={styles.label}>
          Seed:
        </label>
        <div className={styles.seedInputContainer}>
          <input
            id='seed-input'
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
  );
}

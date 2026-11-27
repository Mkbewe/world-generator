import { ClimateStage } from './stage';
import { MapContext } from '../../pipeline/context';
import type { MapConfig, MapState } from '../../types';

function configOf(sampleWidth: number, sampleHeight: number): MapConfig {
  return {
    world: {
      dimensions: {
        widthMeters: sampleWidth,
        heightMeters: sampleHeight,
        sampleWidth,
        sampleHeight,
      },
      seed: 7,
      shape: 'rectangle',
    },
  };
}

describe('ClimateStage', () => {
  it('summarizes temperature over covered cells only', () => {
    const config = configOf(4, 1);
    const temperatureMap = new Float32Array([0.2, 0.4, 0, 0]);
    const state: MapState = {
      worldMask: new Uint8Array([1, 1, 0, 0]),
      temperatureMap,
    };
    const stage = new ClimateStage();

    const metrics = stage.summarize(new MapContext(config, state), { temperatureMap });

    if (!metrics) {
      throw new Error('Expected climate statistics.');
    }
    expect(metrics.temperatureMin).toBeCloseTo(0.2, 5);
    expect(metrics.temperatureMax).toBeCloseTo(0.4, 5);
    expect(Number(metrics.temperatureMean)).toBeCloseTo(0.3, 5);
    expect(Number(metrics.temperatureStdDev)).toBeCloseTo(0.1, 5);
    expect(metrics.bytes).toBe(temperatureMap.byteLength);
  });

  it('rejects temperature outside 0..1 inside the world', () => {
    const config = configOf(1, 1);
    const state: MapState = {
      worldMask: new Uint8Array([1]),
      temperatureMap: new Float32Array([1.2]),
    };

    expect(() => new ClimateStage().validate(state, config)).toThrow(
      'Temperature map contains a value outside 0..1.'
    );
  });

  it('rejects a temperature left outside the world', () => {
    const config = configOf(1, 1);
    const state: MapState = {
      worldMask: new Uint8Array([0]),
      temperatureMap: new Float32Array([0.5]),
    };

    expect(() => new ClimateStage().validate(state, config)).toThrow(
      'Temperature map contains a value outside the world.'
    );
  });
});

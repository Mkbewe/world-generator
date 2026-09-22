import { MapScene } from './map-scene';
import { createRadialLayout } from '../../map-generator/stages/macro-region-presets';
import { LayerCache, LayerRegistry, layerRegistry, MapLayer } from '../layer';

const BASE_CATALOG = [layerRegistry.get('world-shape'), layerRegistry.get('noise')];

function setup() {
  const scene = new MapScene(new LayerCache(), new LayerRegistry(BASE_CATALOG));
  scene.start({ width: 2, height: 2 });
  return scene;
}

describe('MapScene', () => {
  it('invalidates a smoothed region layer when its noise field changes', () => {
    const scene = new MapScene(new LayerCache());
    const size = { width: 3, height: 3 };
    const regionGeometry = {
      seed: 123,
      regions: createRadialLayout(2),
      deformation: { amplitude: 0.1, source: 'noise-map' as const },
    };
    const metadata = { shape: 'disc' as const, regionGeometry };
    const mask = new Uint8Array(9).fill(1);
    const regions = new Uint8Array(9);

    scene.start(size, metadata);
    scene.add('world-shape', mask);
    scene.add('noise', new Float32Array(9).fill(0.25));
    const first = scene.add('macro-region', regions);

    scene.start(size, metadata);
    scene.add('world-shape', mask);
    scene.add('noise', new Float32Array(9).fill(0.75));
    const second = scene.add('macro-region', regions);

    expect(second).not.toBe(first);
  });

  it('invalidates the landmass layer when the layout arrives with the map info', () => {
    const scene = new MapScene(new LayerCache());
    const layout = {
      landmasses: [
        {
          id: 'landmass-1',
          spine: [
            { x: 0.4, y: 0.5 },
            { x: 0.6, y: 0.5 },
          ],
          widthProfile: [0.1, 0.1],
          orientation: 0,
          irregularity: 0,
          positiveShapes: [],
          negativeShapes: [],
          shelfId: 'shelf-1',
        },
      ],
      shelves: [
        { id: 'shelf-1', width: 0.07, targetDepth: 0.35, falloff: 0.5, irregularity: 0.35 },
      ],
    };
    const data = new Uint8Array(2);
    scene.start({ width: 2, height: 1 }, { shape: 'rectangle' });
    scene.add('world-shape', new Uint8Array(2).fill(1));
    const first = scene.add('landmass-layout', data);

    scene.setInfo({ landmassLayout: layout });
    const second = scene.add('landmass-layout', data);

    expect(second).not.toBe(first);
  });

  it('ignores malformed landmass layouts from the map info', () => {
    const scene = new MapScene(new LayerCache());
    const data = new Uint8Array(2);
    scene.start({ width: 2, height: 1 }, { shape: 'rectangle' });
    scene.add('world-shape', new Uint8Array(2).fill(1));
    const first = scene.add('landmass-layout', data);

    scene.setInfo({ landmassLayout: 'nope' });
    const second = scene.add('landmass-layout', data);

    expect(second).toBe(first);
  });

  it('keeps layers cached when the landmass layout arrives late', () => {
    const scene = new MapScene(new LayerCache());
    const layout = {
      landmasses: [
        {
          id: 'landmass-1',
          spine: [
            { x: 0.4, y: 0.5 },
            { x: 0.6, y: 0.5 },
          ],
          widthProfile: [0.1, 0.1],
          orientation: 0,
          irregularity: 0,
          positiveShapes: [],
          negativeShapes: [],
          shelfId: 'shelf-1',
        },
      ],
      shelves: [
        { id: 'shelf-1', width: 0.07, targetDepth: 0.35, falloff: 0.5, irregularity: 0.35 },
      ],
    };
    const data = new Float32Array(4);
    scene.start({ width: 2, height: 2 }, { shape: 'rectangle' });
    scene.add('world-shape', new Uint8Array(4).fill(1));
    const first = scene.add('noise', data);

    // The layout arrives with a later stage, after the earlier layers exist.
    scene.setInfo({ landmassLayout: layout });
    const second = scene.add('noise', data);

    expect(second).toBe(first);
  });

  it('renders dedicated region geometry without a noise layer', () => {
    const scene = new MapScene(new LayerCache());
    scene.start(
      { width: 3, height: 3 },
      {
        shape: 'disc',
        regionGeometry: {
          seed: 123,
          regions: createRadialLayout(2),
          deformation: { amplitude: 0.1, source: 'dedicated' },
        },
      }
    );
    scene.add('world-shape', new Uint8Array(9).fill(1));

    expect(() => scene.add('macro-region', new Uint8Array(9))).not.toThrow();
  });

  it('requires a noise layer for noise-map region geometry', () => {
    const scene = new MapScene(new LayerCache());
    scene.start(
      { width: 3, height: 3 },
      {
        shape: 'disc',
        regionGeometry: {
          seed: 123,
          regions: createRadialLayout(2),
          deformation: { amplitude: 0.1, source: 'noise-map' },
        },
      }
    );
    scene.add('world-shape', new Uint8Array(9).fill(1));

    expect(() => scene.add('macro-region', new Uint8Array(9))).toThrow('requires "noise"');
  });

  it('invalidates cached layers when dimensions, dependencies or definitions change', () => {
    const cache = new LayerCache();
    const scene = new MapScene(cache);
    const mask = new Uint8Array(4).fill(1);
    const noise = new Float32Array(4);
    scene.start({ width: 2, height: 2 });
    const firstWorld = scene.add('world-shape', mask);
    const firstNoise = scene.add('noise', noise);

    scene.start({ width: 1, height: 4 });
    const resizedWorld = scene.add('world-shape', mask);
    expect(resizedWorld).not.toBe(firstWorld);
    expect(resizedWorld.size).toEqual({ width: 1, height: 4 });
    const resizedNoise = scene.add('noise', noise);
    expect(resizedNoise).not.toBe(firstNoise);

    scene.start({ width: 1, height: 4 });
    scene.add('world-shape', new Uint8Array(4));
    const otherNoise = scene.add('noise', noise);
    expect(otherNoise).not.toBe(resizedNoise);
    expect(otherNoise.sample(0, 0)).toBeUndefined();

    const newSpec = { ...layerRegistry.get('noise') };
    const otherScene = new MapScene(
      cache,
      new LayerRegistry([
        layerRegistry.get('world-shape'),
        layerRegistry.get('macro-region'),
        newSpec,
      ])
    );
    otherScene.start({ width: 1, height: 4 });
    otherScene.add('world-shape', scene.getLayers().worldMask);
    expect(otherScene.add('noise', noise)).not.toBe(otherNoise);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('collects complete data independently of rendering and readiness', () => {
    const scene = setup();
    const prepare = vi.spyOn(MapLayer.prototype, 'prepare');
    const mask = new Uint8Array(4).fill(1);
    const noise = new Float32Array(4);

    expect(scene.isComplete()).toBe(false);
    const world = scene.add('world-shape', mask);
    expect(scene.isComplete()).toBe(false);
    scene.add('noise', noise);

    expect(scene.isComplete()).toBe(true);
    expect(scene.options.every(option => !option.available)).toBe(true);
    expect(scene.readyLayer('world-shape')).toBeUndefined();
    expect(scene.getLayers().worldMask).toBe(mask);
    expect(scene.getLayers().noiseMap).toBe(noise);
    expect(prepare).not.toHaveBeenCalled();

    scene.markReady(world);
    expect(scene.readyLayer('world-shape')).toBe(world);
    expect(scene.readyLayer('noise')).toBeUndefined();
    expect(scene.options.map(option => option.available)).toEqual([true, false]);
  });

  it('rejects missing dependencies and refreshes a layer added twice', () => {
    const scene = setup();
    expect(() => scene.add('noise', new Float32Array(4))).toThrow('requires "world-shape"');
    expect([...scene.values()]).toEqual([]);

    const world = scene.add('world-shape', new Uint8Array(4));
    const dispose = vi.spyOn(world, 'dispose');
    scene.markReady(world);
    expect(scene.readyLayer('world-shape')).toBe(world);

    const refreshed = scene.add('world-shape', new Uint8Array(4));

    expect(refreshed).not.toBe(world);
    expect(scene.get('world-shape')).toBe(refreshed);
    expect(scene.readyLayer('world-shape')).toBeUndefined();
    expect(scene.isComplete()).toBe(false);
    expect(dispose).toHaveBeenCalledOnce();
  });

  it('keeps received layers when a run starts with the same map size', () => {
    const scene = setup();
    const world = scene.add('world-shape', new Uint8Array(4));
    scene.markReady(world);

    scene.start({ width: 2, height: 2 });

    expect(scene.get('world-shape')).toBe(world);
    expect(scene.readyLayer('world-shape')).toBe(world);
    expect(scene.isComplete()).toBe(false);
  });

  it('rejects invalid data without registering the layer', () => {
    const scene = setup();
    expect(() => scene.add('world-shape', new Uint8Array(3))).toThrow('data size');
    expect(() => scene.add('world-shape', new Float32Array(4))).toThrow('Invalid world mask');
    expect(scene.get('world-shape')).toBeUndefined();

    scene.add('world-shape', new Uint8Array(4));
    expect(() => scene.add('noise', new Float32Array(3))).toThrow('data size');
    expect(() => scene.add('noise', new Uint8Array(4))).toThrow('Invalid noise map');
    expect(scene.get('noise')).toBeUndefined();
    expect(scene.isComplete()).toBe(false);
  });

  it('resets map state while leaving cached image ownership to the cache', () => {
    const scene = new MapScene(new LayerCache());
    expect(() => scene.add('world-shape', new Uint8Array(4))).toThrow('has not been started');
    scene.start({ width: 2, height: 2 });
    const world = scene.add('world-shape', new Uint8Array(4));
    const dispose = vi.spyOn(world, 'dispose');
    scene.markReady(world);

    scene.reset();
    expect(scene.getLayers()).toEqual({});
    expect([...scene.values()]).toEqual([]);
    expect(scene.options.every(option => !option.available)).toBe(true);
    expect(scene.isComplete()).toBe(false);
    expect(() => scene.size).toThrow('has not been started');
    expect(dispose).not.toHaveBeenCalled();
  });

  it('discards a failed layer and lets the cache dispose its image', () => {
    const scene = setup();
    const world = scene.add('world-shape', new Uint8Array(4));
    const dispose = vi.spyOn(world, 'dispose');

    scene.discard(world);

    expect(scene.get('world-shape')).toBeUndefined();
    expect(scene.options.every(option => !option.available)).toBe(true);
    expect(dispose).toHaveBeenCalledOnce();
  });

  it('does not mark a new layer ready when given a layer from a previous map', () => {
    const scene = setup();
    const previous = scene.add('world-shape', new Uint8Array(4));
    scene.start({ width: 3, height: 3 });
    const current = scene.add('world-shape', new Uint8Array(9));

    scene.markReady(previous);
    expect(scene.size).toEqual({ width: 3, height: 3 });
    expect(scene.readyLayer('world-shape')).toBeUndefined();
    scene.markReady(current);
    expect(scene.readyLayer('world-shape')).toBe(current);
  });
});

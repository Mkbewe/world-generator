import { MapScene } from './map-scene';
import { LAYER_DEFINITIONS, LayerCache, LayerRegistry, MapLayer, type NoiseLayer } from '../layer';

function setup() {
  const scene = new MapScene(new LayerCache());
  scene.start({ width: 2, height: 2 });
  return scene;
}

describe('MapScene', () => {
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
    const otherWorld = scene.add('world-shape', new Uint8Array(4));
    const otherNoise = scene.add('noise', noise);
    expect(otherNoise).not.toBe(resizedNoise);
    expect((otherNoise as NoiseLayer).world).toBe(otherWorld);

    const newDefinition = { ...LAYER_DEFINITIONS.noise };
    const otherScene = new MapScene(
      cache,
      new LayerRegistry({ ...LAYER_DEFINITIONS, noise: newDefinition })
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

  it('rejects missing dependencies and duplicate layers without replacing existing data', () => {
    const scene = setup();
    expect(() => scene.add('noise', new Float32Array(4))).toThrow('requires "world-shape"');
    expect([...scene.values()]).toEqual([]);

    const world = scene.add('world-shape', new Uint8Array(4));
    expect(() => scene.add('world-shape', new Uint8Array(4))).toThrow('already received');
    expect(scene.get('world-shape')).toBe(world);
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

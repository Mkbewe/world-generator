import { MapScene } from './map-scene';
import { createRadialLayout } from '../../map-generator/stages/macro-region/editor/presets';
import type { GeologyPlan } from '../../map-generator/types';
import {
  GeologyPlanVectorLayer,
  LayerCache,
  LayerRegistry,
  layerRegistry,
  MapLayer,
} from '../layer';

const BASE_CATALOG = [layerRegistry.get('world-shape'), layerRegistry.get('macro-region')];

/** Domain data of the geology vector layer. */
const PLAN: GeologyPlan = {
  regions: [
    {
      id: 'region-1',
      centre: { x: 0.25, y: 0.5 },
      weight: 1,
      type: 'ordinary',
      areaSquareMeters: 100,
    },
    {
      id: 'region-2',
      centre: { x: 0.75, y: 0.5 },
      weight: 1,
      type: 'volcanic',
      areaSquareMeters: 100,
    },
  ],
  regionRasterSize: { width: 4, height: 4 },
  regionOwnerMap: new Int16Array(16).fill(0),
  regionBorderDistanceMap: new Float32Array(16).fill(100),
  worldAreaSquareMeters: 400,
};

function setup() {
  const scene = new MapScene(new LayerCache(), new LayerRegistry(BASE_CATALOG));
  scene.start({ width: 2, height: 2 });
  return scene;
}

describe('MapScene', () => {
  it('applies the highlighted element without rebuilding the vector layer', () => {
    const scene = new MapScene(new LayerCache());
    scene.start({ width: 4, height: 4 });
    scene.add('world-shape', new Uint8Array(16).fill(1));
    const added = scene.setInfo({ geologyPlan: PLAN });

    expect(added.map(layer => layer.id)).toEqual(['geology']);

    const repainted = scene.setSelection('region-2');

    expect(repainted.map(layer => layer.id)).toEqual(['geology']);
    expect(repainted[0]).toBe(added[0]);
    expect(scene.setSelection('region-2')).toEqual([]);
    expect(scene.setSelection(undefined).map(layer => layer.id)).toEqual(['geology']);
  });

  it('renders region geometry with its own deterministic border field', () => {
    const scene = new MapScene(new LayerCache());
    scene.start(
      { width: 3, height: 3 },
      {
        shape: 'disc',
        regionGeometry: {
          seed: 123,
          regions: createRadialLayout(2),
          deformation: { amplitude: 0.1 },
        },
      }
    );
    scene.add('world-shape', new Uint8Array(9).fill(1));

    expect(() => scene.add('macro-region', new Uint8Array(9))).not.toThrow();
  });

  it('invalidates cached layers when dimensions, dependencies or definitions change', () => {
    const cache = new LayerCache();
    const scene = new MapScene(cache);
    const mask = new Uint8Array(4).fill(1);
    const regions = new Uint8Array(4);
    scene.start({ width: 2, height: 2 });
    const [firstWorld] = scene.add('world-shape', mask);
    const [firstRegions] = scene.add('macro-region', regions);

    scene.start({ width: 1, height: 4 });
    const [resizedWorld] = scene.add('world-shape', mask);
    expect(resizedWorld).not.toBe(firstWorld);
    expect(resizedWorld.size).toEqual({ width: 1, height: 4 });
    const [resizedRegions] = scene.add('macro-region', regions);
    expect(resizedRegions).not.toBe(firstRegions);

    scene.start({ width: 1, height: 4 });
    scene.add('world-shape', new Uint8Array(4));
    const [otherRegions] = scene.add('macro-region', regions);
    expect(otherRegions).not.toBe(resizedRegions);
    expect(otherRegions.sample(0, 0)).toBeUndefined();

    const newSpec = { ...layerRegistry.get('macro-region') };
    const otherScene = new MapScene(
      cache,
      new LayerRegistry([layerRegistry.get('world-shape'), newSpec])
    );
    otherScene.start({ width: 1, height: 4 });
    otherScene.add('world-shape', scene.getLayers().worldMask);
    const [otherRegionLayer] = otherScene.add('macro-region', regions);
    expect(otherRegionLayer).not.toBe(otherRegions);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('collects complete data independently of rendering and readiness', () => {
    const scene = setup();
    const prepare = vi.spyOn(MapLayer.prototype, 'prepare');
    const mask = new Uint8Array(4).fill(1);
    const regions = new Uint8Array(4);

    expect(scene.isComplete()).toBe(false);
    const [world] = scene.add('world-shape', mask);
    expect(scene.isComplete()).toBe(false);
    scene.add('macro-region', regions);

    expect(scene.isComplete()).toBe(true);
    expect(scene.options.every(option => !option.available)).toBe(true);
    expect(scene.readyLayer('world-shape')).toBeUndefined();
    expect(scene.getLayers().worldMask).toBe(mask);
    expect(scene.getLayers().macroRegionIdMap).toBe(regions);
    expect(prepare).not.toHaveBeenCalled();

    scene.markReady(world);
    expect(scene.readyLayer('world-shape')).toBe(world);
    expect(scene.readyLayer('macro-region')).toBeUndefined();
    expect(scene.options.map(option => option.available)).toEqual([true, false]);
  });

  it('rejects missing dependencies and refreshes a layer added twice', () => {
    const scene = setup();
    expect(() => scene.add('macro-region', new Uint8Array(4))).toThrow('requires "world-shape"');
    expect([...scene.values()]).toEqual([]);

    const [world] = scene.add('world-shape', new Uint8Array(4));
    const dispose = vi.spyOn(world, 'dispose');
    scene.markReady(world);
    expect(scene.readyLayer('world-shape')).toBe(world);

    const [refreshed] = scene.add('world-shape', new Uint8Array(4));

    expect(refreshed).not.toBe(world);
    expect(scene.get('world-shape')).toBe(refreshed);
    expect(scene.readyLayer('world-shape')).toBeUndefined();
    expect(scene.isComplete()).toBe(false);
    expect(dispose).toHaveBeenCalledOnce();
  });

  it('keeps received layers when a run starts with the same map size', () => {
    const scene = setup();
    const [world] = scene.add('world-shape', new Uint8Array(4));
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
    expect(() => scene.add('macro-region', new Uint8Array(3))).toThrow('data size');
    expect(() => scene.add('macro-region', new Float32Array(4))).toThrow(
      'Invalid macro region id map'
    );
    expect(scene.get('macro-region')).toBeUndefined();
    expect(scene.isComplete()).toBe(false);
  });

  it('resets map state while leaving cached image ownership to the cache', () => {
    const scene = new MapScene(new LayerCache());
    expect(() => scene.add('world-shape', new Uint8Array(4))).toThrow('has not been started');
    scene.start({ width: 2, height: 2 });
    const [world] = scene.add('world-shape', new Uint8Array(4));
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
    const [world] = scene.add('world-shape', new Uint8Array(4));
    const dispose = vi.spyOn(world, 'dispose');

    scene.discard(world);

    expect(scene.get('world-shape')).toBeUndefined();
    expect(scene.options.every(option => !option.available)).toBe(true);
    expect(dispose).toHaveBeenCalledOnce();
  });

  it('does not mark a new layer ready when given a layer from a previous map', () => {
    const scene = setup();
    const [previous] = scene.add('world-shape', new Uint8Array(4));
    scene.start({ width: 3, height: 3 });
    const [current] = scene.add('world-shape', new Uint8Array(9));

    scene.markReady(previous);
    expect(scene.size).toEqual({ width: 3, height: 3 });
    expect(scene.readyLayer('world-shape')).toBeUndefined();
    scene.markReady(current);
    expect(scene.readyLayer('world-shape')).toBe(current);
  });

  it('adds the vector layer when its domain data and mask are present', () => {
    const scene = new MapScene(new LayerCache());
    scene.start({ width: 4, height: 4 }, { shape: 'rectangle' });
    scene.add('world-shape', new Uint8Array(16).fill(1));

    scene.setInfo({ geologyPlan: PLAN });

    expect(scene.get('geology')).toBeInstanceOf(GeologyPlanVectorLayer);
  });

  it('waits for the mask before adding the vector layer', () => {
    const scene = new MapScene(new LayerCache());
    scene.start({ width: 4, height: 4 }, { shape: 'rectangle' });
    scene.setInfo({ geologyPlan: PLAN });

    expect(scene.get('geology')).toBeUndefined();

    scene.add('world-shape', new Uint8Array(16).fill(1));

    expect(scene.get('geology')).toBeInstanceOf(GeologyPlanVectorLayer);
  });

  it('refuses a vector catalog without a factory', () => {
    expect(() => new MapScene(new LayerCache(), layerRegistry, new Map())).toThrow(
      'Missing vector layer factory: geology'
    );
  });

  it('returns the vector layers a new mask unlocks', () => {
    const scene = new MapScene(new LayerCache());
    scene.start({ width: 4, height: 4 }, { shape: 'rectangle' });
    scene.setInfo({ geologyPlan: PLAN });

    const added = scene.add('world-shape', new Uint8Array(16).fill(1));

    expect(added[0].id).toBe('world-shape');
    expect(added[1]).toBeInstanceOf(GeologyPlanVectorLayer);
  });

  it('ignores malformed domain data', () => {
    const scene = new MapScene(new LayerCache());
    scene.start({ width: 4, height: 4 }, { shape: 'rectangle' });
    scene.add('world-shape', new Uint8Array(16).fill(1));

    scene.setInfo({ geologyPlan: { regions: 'nope' } });

    expect(scene.get('geology')).toBeUndefined();
  });

  it('reuses the vector layer while the domain data is unchanged', () => {
    const scene = new MapScene(new LayerCache());
    scene.start({ width: 4, height: 4 }, { shape: 'rectangle' });
    scene.add('world-shape', new Uint8Array(16).fill(1));
    scene.setInfo({ geologyPlan: PLAN });
    const first = scene.get('geology');

    const added = scene.setInfo({ geologyPlan: PLAN });

    expect(first).toBeDefined();
    expect(scene.get('geology')).toBe(first);
    expect(added).toEqual([]);
  });
});

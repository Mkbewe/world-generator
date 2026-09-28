import { createGeologicalArea } from './presets';
import { GeologyStage } from './stage';
import { MapContext } from '../../pipeline/context';
import type { GeologicalAreaConfig, MapConfig, MapState } from '../../types';

const CONFIG: MapConfig = {
  world: {
    dimensions: { widthMeters: 2000, heightMeters: 2000, sampleWidth: 64, sampleHeight: 64 },
    seed: 17,
    shape: 'rectangle',
  },
  noise: { frequency: 4, octaves: 2, persistence: 0.5, lacunarity: 2 },
};

function context(areas?: GeologicalAreaConfig[]): MapContext<MapConfig, MapState, string> {
  const list = areas ?? [
    createGeologicalArea('a', 'shallow-archipelago'),
    createGeologicalArea('b', 'volcanic'),
  ];
  return new MapContext<MapConfig, MapState, string>({ ...CONFIG, geology: { areas: list } }, {});
}

describe('GeologyStage', () => {
  it('produces a validated plan with one entry per area', async () => {
    const stage = new GeologyStage();
    const data = await stage.execute(context(), new AbortController().signal, () => {});

    expect(data.geologyPlan.areas).toHaveLength(2);
    expect(() => stage.validate({ geologyPlan: data.geologyPlan }, CONFIG)).not.toThrow();
  });

  it('rejects an invalid configuration before planning', async () => {
    const broken = { ...createGeologicalArea('a', 'volcanic'), extent: 0 };

    await expect(
      new GeologyStage().execute(context([broken]), new AbortController().signal, () => {})
    ).rejects.toThrow('extent must be within');
  });

  it('rejects a missing plan on validate', () => {
    expect(() => new GeologyStage().validate({}, CONFIG)).toThrow('required map data');
  });

  it('summarizes the plan', async () => {
    const stage = new GeologyStage();
    const source = context();
    const data = await stage.execute(source, new AbortController().signal, () => {});

    expect(stage.summarize?.(source, data)).toMatchObject({ areas: 2 });
  });
});

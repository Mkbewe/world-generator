import { DEFAULT_GEOLOGY_CONFIG } from './config/presets';
import { GeologyStage } from './stage';
import { MapContext } from '../../pipeline/context';
import type { GeologyConfig, MapConfig, MapState } from '../../types';

const CONFIG: MapConfig = {
  world: {
    dimensions: { widthMeters: 2000, heightMeters: 2000, sampleWidth: 64, sampleHeight: 64 },
    seed: 17,
    shape: 'rectangle',
  },
};

const GEOLOGY: GeologyConfig = DEFAULT_GEOLOGY_CONFIG;

function context(geology: GeologyConfig = GEOLOGY): MapContext<MapConfig, MapState, string> {
  return new MapContext<MapConfig, MapState, string>({ ...CONFIG, geology }, {});
}

describe('GeologyStage', () => {
  it('produces a validated region raster', async () => {
    const stage = new GeologyStage();
    const data = await stage.execute(context(), new AbortController().signal, () => {});

    expect(data.geologyPlan.regions).toHaveLength(5);
    expect(data.geologyPlan.regionOwnerMap).toHaveLength(64 * 64);
    expect(() => stage.validate({ geologyPlan: data.geologyPlan }, CONFIG)).not.toThrow();
  });

  it('rejects an invalid configuration before planning', async () => {
    await expect(
      new GeologyStage().execute(
        context({ ...GEOLOGY, regionCount: 4 }),
        new AbortController().signal,
        () => {}
      )
    ).rejects.toThrow('one entry per region');
    await expect(
      new GeologyStage().execute(
        context({ ...GEOLOGY, regionCount: 11 }),
        new AbortController().signal,
        () => {}
      )
    ).rejects.toThrow('Region count must be an integer');
  });

  it('rejects a missing plan on validate', () => {
    expect(() => new GeologyStage().validate({}, CONFIG)).toThrow('required map data');
  });

  it('summarizes the plan by region type', async () => {
    const stage = new GeologyStage();
    const source = context();
    const data = await stage.execute(source, new AbortController().signal, () => {});

    const summary = stage.summarize?.(source, data);
    expect(summary).toMatchObject({ regions: 5 });
    const total =
      Number(summary?.ordinary ?? 0) + Number(summary?.volcanic ?? 0) + Number(summary?.atoll ?? 0);
    expect(total).toBe(5);
  });
});

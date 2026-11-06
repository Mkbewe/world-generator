import type { MapProjection } from './view/view-transform';
import { describeOceanCurrent, sampleOceanCurrentArrows } from './ocean-current';

const projection: MapProjection = {
  cellSize: 10,
  left: 0,
  top: 0,
  width: 100,
  height: 50,
};

function world(contains: (x: number, y: number) => boolean = () => true) {
  return { size: { width: 10, height: 5 }, contains };
}

describe('sampleOceanCurrentArrows', () => {
  it('samples cell centres on a screen-space grid', () => {
    const map = new Float32Array(50);
    const strength = new Float32Array(50);
    map[26] = Math.PI / 2;
    strength[22] = 0.5;
    strength[26] = 0.75;

    expect(sampleOceanCurrentArrows(world(), map, strength, projection, 1)).toEqual([
      { x: 25, y: 25, angle: 0, strength: 0.5 },
      { x: 65, y: 25, angle: Math.fround(Math.PI / 2), strength: 0.75 },
    ]);
  });

  it('clips samples to the world mask', () => {
    const map = new Float32Array(50);
    const strength = new Float32Array(50).fill(0.5);

    const arrows = sampleOceanCurrentArrows(
      world(x => x < 5),
      map,
      strength,
      projection,
      1
    );

    expect(arrows.map(arrow => arrow.x)).toEqual([25]);
  });

  it('skips calm cells and scales spacing with the device ratio', () => {
    const map = new Float32Array(50);
    const strength = new Float32Array(50).fill(0.01);
    strength[22] = 0.5;
    strength[44] = 0.5;

    expect(sampleOceanCurrentArrows(world(), map, strength, projection, 1)).toHaveLength(1);
    expect(sampleOceanCurrentArrows(world(), map, strength, projection, 2)).toEqual([
      { x: 45, y: 45, angle: 0, strength: 0.5 },
    ]);
  });
});

describe('describeOceanCurrent', () => {
  it('names every direction and reports calm water', () => {
    expect(describeOceanCurrent(0, 0.4)).toBe('East · 40%');
    expect(describeOceanCurrent(Math.PI / 4, 0.4)).toBe('Southeast · 40%');
    expect(describeOceanCurrent(Math.PI / 2, 0.4)).toBe('South · 40%');
    expect(describeOceanCurrent((3 * Math.PI) / 4, 0.4)).toBe('Southwest · 40%');
    expect(describeOceanCurrent(Math.PI, 0.4)).toBe('West · 40%');
    expect(describeOceanCurrent((5 * Math.PI) / 4, 0.4)).toBe('Northwest · 40%');
    expect(describeOceanCurrent((3 * Math.PI) / 2, 0.4)).toBe('North · 40%');
    expect(describeOceanCurrent((7 * Math.PI) / 4, 0.4)).toBe('Northeast · 40%');
    expect(describeOceanCurrent(0, 0)).toBe('Calm');
  });
});

import { ARCHETYPE_RECIPES, type ArchetypeRange, LANDMASS_ARCHETYPES } from './landmass-archetypes';
import { DEFAULT_LANDMASS_CONFIG, LANDMASS_MARGIN, MAX_LANDMASSES } from './landmass-defaults';
import { createStructure, type StructureSeed } from './landmass-layout';
import { createLandmassSampler } from './landmass-sampler';
import { containsWorld, type WorldShape } from '../../world-shape';
import { SeededRandom } from '../random/seeded-random';
import type { LandmassArchetype, LandmassConfig, LandShape, WorldPoint } from '../types';

function config(archetypes?: LandmassArchetype[]): LandmassConfig {
  return { ...DEFAULT_LANDMASS_CONFIG, archetypes };
}

function structure(archetype: LandmassArchetype, seed = 5, size = 1): StructureSeed {
  return createStructure(0, { ...config([archetype]), size }, 'disc', new SeededRandom(seed));
}

function angleBetween(from: WorldPoint, to: WorldPoint): number {
  return Math.atan2(to.y - from.y, to.x - from.x);
}

function jointTurns(spine: readonly WorldPoint[]): number[] {
  const turns: number[] = [];
  for (let index = 1; index < spine.length - 1; index++) {
    const turn =
      angleBetween(spine[index], spine[index + 1]) - angleBetween(spine[index - 1], spine[index]);
    turns.push(Math.atan2(Math.sin(turn), Math.cos(turn)));
  }
  return turns;
}

function spineLength(spine: readonly WorldPoint[]): number {
  let length = 0;
  for (let index = 1; index < spine.length; index++) {
    length += Math.hypot(spine[index].x - spine[index - 1].x, spine[index].y - spine[index - 1].y);
  }
  return length;
}

/** Spine length over the full width: how slender the outline is compared to its width. */
function slenderness(seed: StructureSeed): number {
  const meanWidth =
    seed.widthProfile.reduce((sum, width) => sum + width, 0) / seed.widthProfile.length;
  return spineLength(seed.spine) / (2 * meanWidth);
}

/** Independent check: the full outline stays inside the world margin. */
function outlineEscapesWorld(structure: StructureSeed, shape: WorldShape): boolean {
  const insideBy = (point: WorldPoint, extra: number): boolean => {
    const scale = 1 - 2 * (LANDMASS_MARGIN + extra);
    return scale > 0 && containsWorld(shape, (2 * point.x - 1) / scale, (2 * point.y - 1) / scale);
  };

  for (const [index, point] of structure.spine.entries()) {
    if (!insideBy(point, structure.widthProfile[index])) {
      return true;
    }
  }
  return structure.positiveShapes.some(land => {
    const cos = Math.cos(land.orientation);
    const sin = Math.sin(land.orientation);
    for (let step = 0; step < 24; step++) {
      const angle = (step / 24) * Math.PI * 2;
      const along = Math.cos(angle) * land.halfLength;
      const across = Math.sin(angle) * land.halfWidth;
      const point = {
        x: land.center.x + along * cos - across * sin,
        y: land.center.y + along * sin + across * cos,
      };
      if (!insideBy(point, 0)) {
        return true;
      }
    }
    return false;
  });
}

function barShape(seed: StructureSeed, id = 'landmass-1-bar-1'): LandShape {
  const bar = seed.positiveShapes.find(shape => shape.id === id);
  if (!bar) {
    throw new Error(`Expected the recipe bar "${id}".`);
  }
  return bar;
}

/** Connected components of one structure id on a sampled grid, 4-connectivity. */
function components(landmassAt: (x: number, y: number) => number, id: number, size = 120): number {
  const cells = new Uint8Array(size * size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      cells[y * size + x] = landmassAt(x / (size - 1), y / (size - 1)) === id ? 1 : 0;
    }
  }

  const stack: number[] = [];
  let found = 0;
  for (let start = 0; start < cells.length; start++) {
    if (cells[start] === 0) {
      continue;
    }
    found++;
    cells[start] = 0;
    stack.push(start);
    while (stack.length > 0) {
      const cell = stack[stack.length - 1];
      stack.length -= 1;
      const x = cell % size;
      const neighbours = [
        x > 0 ? cell - 1 : -1,
        x + 1 < size ? cell + 1 : -1,
        cell - size,
        cell + size,
      ];
      for (const neighbour of neighbours) {
        if (neighbour >= 0 && neighbour < cells.length && cells[neighbour] === 1) {
          cells[neighbour] = 0;
          stack.push(neighbour);
        }
      }
    }
  }
  return found;
}

describe('landmass archetypes', () => {
  it('keeps every recipe consistent with its joints', () => {
    for (const archetype of LANDMASS_ARCHETYPES) {
      const recipe = ARCHETYPE_RECIPES[archetype];
      const ranges: ArchetypeRange[] = [
        ...recipe.joints,
        ...recipe.segments,
        recipe.width,
        recipe.taper,
      ];

      expect(recipe.segments).toHaveLength(recipe.joints.length + 1);
      expect(ranges.every(range => range[0] <= range[1])).toBe(true);
      expect(recipe.segments.every(segment => segment[0] > 0)).toBe(true);
      expect(recipe.width[0]).toBeGreaterThan(0);
      for (const bar of recipe.bars ?? []) {
        expect(bar.at[0]).toBeGreaterThanOrEqual(0);
        expect(bar.at[1]).toBeLessThanOrEqual(1);
        expect(bar.length[0]).toBeGreaterThan(0);
        expect(bar.width[0]).toBeGreaterThan(0);
        expect(bar.bias[0]).toBeGreaterThan(-1);
        expect(bar.bias[1]).toBeLessThan(1);
        if (bar.angle !== 'bisector') {
          expect(bar.angle[0]).toBeLessThanOrEqual(bar.angle[1]);
        }
      }
    }
  });

  it('generates every archetype inside the world shape', () => {
    for (const archetype of LANDMASS_ARCHETYPES) {
      const seed = structure(archetype);

      expect(seed.spine).toHaveLength(
        Math.max(3, ARCHETYPE_RECIPES[archetype].segments.length + 1)
      );
      expect(seed.widthProfile).toHaveLength(seed.spine.length);
      expect(seed.widthProfile.every(width => width > 0)).toBe(true);
      for (const point of seed.spine) {
        expect(point.x).toBeGreaterThanOrEqual(0);
        expect(point.x).toBeLessThanOrEqual(1);
        expect(point.y).toBeGreaterThanOrEqual(0);
        expect(point.y).toBeLessThanOrEqual(1);
        expect(containsWorld('disc', 2 * point.x - 1, 2 * point.y - 1)).toBe(true);
      }
    }
  });

  it('keeps every archetype outline inside the world margin', () => {
    for (const archetype of LANDMASS_ARCHETYPES) {
      for (const worldShape of ['disc', 'rectangle'] as const) {
        for (const size of [0.4, 1]) {
          for (const seed of [5, 17, 99]) {
            const structure = createStructure(
              0,
              { ...config([archetype]), size },
              worldShape,
              new SeededRandom(seed)
            );

            expect(outlineEscapesWorld(structure, worldShape)).toBe(false);
          }
        }
      }
    }
  });

  it('gives each archetype its own joint pattern', () => {
    const l = jointTurns(structure('l').spine);
    expect(l).toHaveLength(1);
    expect(Math.abs(l[0])).toBeGreaterThanOrEqual(1.05);
    expect(Math.abs(l[0])).toBeLessThanOrEqual(2.09);

    const z = jointTurns(structure('z').spine);
    expect(z).toHaveLength(2);
    expect(Math.sign(z[0])).toBe(-Math.sign(z[1]));
    expect(Math.abs(z[0])).toBeGreaterThanOrEqual(0.9);
    expect(Math.abs(z[0])).toBeLessThanOrEqual(1.5);

    const u = jointTurns(structure('u').spine);
    expect(u).toHaveLength(4);
    expect(u.every(turn => Math.sign(turn) === Math.sign(u[0]))).toBe(true);
    expect(u.every(turn => Math.abs(turn) >= 0.64 && Math.abs(turn) <= 0.88)).toBe(true);

    const s = jointTurns(structure('s').spine);
    expect(s).toHaveLength(4);
    expect(s.slice(0, 2).every(turn => Math.sign(turn) === Math.sign(s[0]))).toBe(true);
    expect(s.slice(2).every(turn => Math.sign(turn) === -Math.sign(s[0]))).toBe(true);

    const elongated = jointTurns(structure('elongated').spine);
    expect(elongated).toHaveLength(1);
    expect(Math.abs(elongated[0])).toBeLessThanOrEqual(0.35);

    const v = jointTurns(structure('v').spine);
    expect(v).toHaveLength(1);
    expect(Math.abs(v[0])).toBeGreaterThanOrEqual(1.9);
    expect(Math.abs(v[0])).toBeLessThanOrEqual(2.6);

    const y = jointTurns(structure('y').spine);
    expect(y).toHaveLength(1);
    expect(Math.abs(y[0])).toBeGreaterThanOrEqual(1.8);
    expect(Math.abs(y[0])).toBeLessThanOrEqual(2.3);

    expect(structure('x').spine).toHaveLength(3);
    expect(structure('t').spine).toHaveLength(3);
  });

  it('branches y, x and t off their spine with a recipe bar', () => {
    const y = structure('y');
    const yBar = barShape(y);
    expect(Math.hypot(yBar.center.x - y.spine[1].x, yBar.center.y - y.spine[1].y)).toBeLessThan(
      yBar.halfLength * 0.96
    );
    expect(yBar.halfLength).toBeGreaterThan(yBar.halfWidth);

    const x = structure('x');
    const xBar = barShape(x);
    expect(Math.hypot(xBar.center.x - x.spine[1].x, xBar.center.y - x.spine[1].y)).toBeLessThan(
      spineLength(x.spine) * 0.16 + xBar.halfLength * 0.26
    );

    const t = structure('t');
    const tBar = barShape(t);
    const tip = t.spine[t.spine.length - 1];
    expect(Math.hypot(tBar.center.x - tip.x, tBar.center.y - tip.y)).toBeLessThan(
      spineLength(t.spine) * 0.19 + tBar.halfLength * 0.26
    );
  });

  it('keeps round outlines compact and elongated ones slender', () => {
    expect(slenderness(structure('round'))).toBeLessThan(0.5);
    expect(slenderness(structure('oval'))).toBeGreaterThan(0.4);
    expect(slenderness(structure('oval'))).toBeLessThan(1.2);
    expect(slenderness(structure('elongated'))).toBeGreaterThan(1.8);
    expect(slenderness(structure('l'))).toBeGreaterThan(1.6);
    expect(slenderness(structure('u'))).toBeGreaterThan(1.5);
    expect(slenderness(structure('s'))).toBeGreaterThan(1.5);
    expect(slenderness(structure('z'))).toBeGreaterThan(2.2);
    expect(slenderness(structure('v'))).toBeGreaterThan(2);
  });

  it('gives short spines a full-width middle instead of a uniformly tapered body', () => {
    for (const archetype of ['round', 'oval', 'x', 't'] as const) {
      const profile = structure(archetype).widthProfile;
      expect(profile).toHaveLength(3);
      expect(profile[1]).toBeGreaterThan(profile[0]);
      expect(profile[1]).toBeGreaterThan(profile[2]);
    }
  });

  it('points the Y stem away from the corner between its arms', () => {
    for (const seed of [5, 17, 99]) {
      const y = structure('y', seed);
      const bar = barShape(y);
      const junction = y.spine[1];
      const stem = Math.atan2(bar.center.y - junction.y, bar.center.x - junction.x);

      for (const armPoint of [y.spine[0], y.spine[2]]) {
        const arm = Math.atan2(armPoint.y - junction.y, armPoint.x - junction.x);
        const gap = Math.abs(Math.atan2(Math.sin(stem - arm), Math.cos(stem - arm)));
        expect(gap).toBeGreaterThan(Math.PI / 2);
      }
    }
  });

  it('reads the round archetype as a compact footprint on the id map', () => {
    const seed = structure('round');
    const landmassAt = createLandmassSampler([seed]);
    let minX = 1;
    let maxX = 0;
    let minY = 1;
    let maxY = 0;

    for (let y = 0; y <= 200; y++) {
      for (let x = 0; x <= 200; x++) {
        if (landmassAt(x / 200, y / 200) === 0) {
          continue;
        }
        minX = Math.min(minX, x / 200);
        maxX = Math.max(maxX, x / 200);
        minY = Math.min(minY, y / 200);
        maxY = Math.max(maxY, y / 200);
      }
    }

    const ratio = (maxX - minX) / (maxY - minY);
    expect(ratio).toBeGreaterThan(0.6);
    expect(ratio).toBeLessThan(1.7);
  });

  it('varies the length and width of every archetype between seeds', () => {
    for (const archetype of LANDMASS_ARCHETYPES) {
      const first = structure(archetype, 5);
      const second = structure(archetype, 99);
      expect(spineLength(first.spine)).not.toBeCloseTo(spineLength(second.spine), 3);
      expect(first.widthProfile).not.toEqual(second.widthProfile);
    }
  });

  it('draws only the configured pool', () => {
    const random = new SeededRandom(7);
    const round = Array.from({ length: 4 }, (_, index) =>
      createStructure(index, config(['round']), 'disc', random)
    );
    const l = Array.from({ length: 4 }, (_, index) =>
      createStructure(index, config(['l']), 'disc', random)
    );

    expect(round.every(seed => seed.spine.length === 3)).toBe(true);
    expect(l.every(seed => seed.spine.length === 3)).toBe(true);
  });

  it('keeps every structure connected across seeds, bays and peninsulas included', () => {
    for (const archetype of LANDMASS_ARCHETYPES) {
      for (const seed of [5, 17, 99]) {
        const landmassAt = createLandmassSampler([structure(archetype, seed)]);
        expect(components(landmassAt, 1)).toBe(1);
      }
    }
  });

  it.each([DEFAULT_LANDMASS_CONFIG.count, MAX_LANDMASSES])(
    'keeps %i structures from sharing cells',
    count => {
      const random = new SeededRandom(11);
      const placed: StructureSeed[] = [];
      for (let index = 0; index < count; index++) {
        placed.push(createStructure(index, config(), 'disc', random, placed));
      }

      const samplers = placed.map(seed => createLandmassSampler([seed]));
      let overlaps = 0;
      for (let row = 0; row <= 120; row++) {
        for (let column = 0; column <= 120; column++) {
          const x = column / 120;
          const y = row / 120;
          let owners = 0;
          for (const landmassAt of samplers) {
            if (landmassAt(x, y) > 0 && ++owners > 1) {
              break;
            }
          }
          if (owners > 1) {
            overlaps++;
          }
        }
      }
      expect(overlaps).toBe(0);
    }
  );

  it('spreads structures over the world instead of clustering them', () => {
    const random = new SeededRandom(11);
    const placed: StructureSeed[] = [];
    for (let index = 0; index < DEFAULT_LANDMASS_CONFIG.count; index++) {
      placed.push(createStructure(index, config(), 'disc', random, placed));
    }

    const centres = placed.map(seed => ({
      x: seed.spine.reduce((sum, point) => sum + point.x, 0) / seed.spine.length,
      y: seed.spine.reduce((sum, point) => sum + point.y, 0) / seed.spine.length,
    }));
    let nearest = Infinity;
    let spreadX = 0;
    let spreadY = 0;
    let minX = 1;
    let maxX = 0;
    let minY = 1;
    let maxY = 0;

    for (const [index, centre] of centres.entries()) {
      minX = Math.min(minX, centre.x);
      maxX = Math.max(maxX, centre.x);
      minY = Math.min(minY, centre.y);
      maxY = Math.max(maxY, centre.y);
      for (const other of centres.slice(index + 1)) {
        nearest = Math.min(nearest, Math.hypot(centre.x - other.x, centre.y - other.y));
      }
    }
    spreadX = maxX - minX;
    spreadY = maxY - minY;

    expect(nearest).toBeGreaterThan(0.12);
    expect(spreadX).toBeGreaterThan(0.3);
    expect(spreadY).toBeGreaterThan(0.3);
  });

  it('mixes archetypes when no pool is configured', () => {
    const random = new SeededRandom(7);
    const lengths = new Set(
      Array.from(
        { length: 40 },
        (_, index) => createStructure(index, config(), 'disc', random).spine.length
      )
    );

    expect(lengths.size).toBeGreaterThanOrEqual(3);
  });
});

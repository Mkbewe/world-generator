import {
  StructureCharacterVectorLayer,
  structureCharacterVectorLayerFactory,
} from './structure-character-vector-layer';
import type { CharacterZone, GeologicalStructure, LandmassLayout } from '../../map-generator/types';

const STRUCTURE: GeologicalStructure = {
  id: 'large',
  archetype: 'elongated',
  nodes: [
    { id: 'large-n1', position: { x: 0.3, y: 0.5 }, radius: 0.05 },
    { id: 'large-n2', position: { x: 0.7, y: 0.5 }, radius: 0.05 },
  ],
  edges: [{ id: 'large-e1', from: 'large-n1', to: 'large-n2' }],
  shelfId: 'shelf-1',
};
const LAYOUT: LandmassLayout = { structures: [STRUCTURE], shelves: [] };

const VALUES = {
  elevation: 0.5,
  roughness: 0.5,
  mountainStrength: 0.8,
  hillStrength: 0.5,
  plateauStrength: 0.3,
  lakePotential: 0.2,
  erosionStrength: 0.5,
  coastalCliffStrength: 0.4,
};

const WHOLE: CharacterZone = {
  id: 'large-zone-1',
  structureId: 'large',
  character: 'mountains',
  geometry: { kind: 'whole' },
  values: VALUES,
};
const HALF: CharacterZone = {
  id: 'large-zone-2',
  structureId: 'large',
  character: 'plains',
  geometry: { kind: 'half', axis: 'x', side: 'low' },
  values: VALUES,
};

describe('StructureCharacterVectorLayer', () => {
  it('samples the whole zone when nothing else covers the cell', () => {
    const layer = new StructureCharacterVectorLayer(
      'structure-character',
      { width: 11, height: 11 },
      [WHOLE],
      { layout: LAYOUT }
    );
    try {
      expect(layer.sample(5, 5)).toEqual({ id: 'large-zone-1', label: 'Mountains' });
      expect(layer.sample(0, 0)).toBeUndefined();
    } finally {
      layer.dispose();
    }
  });

  it('prefers a split zone inside its geometry', () => {
    const layer = new StructureCharacterVectorLayer(
      'structure-character',
      { width: 11, height: 11 },
      [WHOLE, HALF],
      { layout: LAYOUT }
    );
    try {
      expect(layer.sample(4, 5)).toEqual({ id: 'large-zone-2', label: 'Plains' });
      expect(layer.sample(7, 5)).toEqual({ id: 'large-zone-1', label: 'Mountains' });
    } finally {
      layer.dispose();
    }
  });

  it('validates the domain data before building the layer', () => {
    expect(structureCharacterVectorLayerFactory.supports([WHOLE])).toBe(true);
    expect(structureCharacterVectorLayerFactory.supports({ nope: true })).toBe(false);

    const layer = structureCharacterVectorLayerFactory.create({
      id: 'structure-character',
      size: { width: 4, height: 4 },
      value: [WHOLE],
      info: {},
    });
    try {
      expect(layer).toBeInstanceOf(StructureCharacterVectorLayer);
      expect(layer.id).toBe('structure-character');
    } finally {
      layer.dispose();
    }

    expect(() =>
      structureCharacterVectorLayerFactory.create({
        id: 'structure-character',
        size: { width: 4, height: 4 },
        value: { nope: true },
        info: {},
      })
    ).toThrow('Invalid structure zone data');
  });
});

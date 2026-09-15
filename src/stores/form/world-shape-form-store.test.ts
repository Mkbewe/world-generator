import { useWorldShapeFormStore, WORLD_SHAPE_FORM_DEFAULTS } from './world-shape-form-store';

describe('useWorldShapeFormStore', () => {
  beforeEach(() => {
    useWorldShapeFormStore.setState({ ...WORLD_SHAPE_FORM_DEFAULTS });
  });

  it('starts with the default shape, size and terrain detail', () => {
    expect(useWorldShapeFormStore.getState()).toMatchObject(WORLD_SHAPE_FORM_DEFAULTS);
  });

  it('updates the shape, size and detail independently', () => {
    const store = useWorldShapeFormStore.getState();

    store.setShape('rectangle');
    store.setSizeMeters(2400);
    store.setMetersPerSample(2);

    expect(useWorldShapeFormStore.getState()).toMatchObject({
      shape: 'rectangle',
      sizeMeters: 2400,
      metersPerSample: 2,
    });
  });
});

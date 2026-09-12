import { useWorldShapeFormStore, WORLD_SHAPE_FORM_DEFAULTS } from './world-shape-form-store';

describe('useWorldShapeFormStore', () => {
  beforeEach(() => {
    useWorldShapeFormStore.setState({ ...WORLD_SHAPE_FORM_DEFAULTS });
  });

  it('starts with the default shape and size', () => {
    expect(useWorldShapeFormStore.getState()).toMatchObject(WORLD_SHAPE_FORM_DEFAULTS);
  });

  it('updates the shape and size independently', () => {
    const store = useWorldShapeFormStore.getState();

    store.setShape('rectangle');
    store.setSize(2400);

    expect(useWorldShapeFormStore.getState()).toMatchObject({
      shape: 'rectangle',
      size: 2400,
    });
  });
});

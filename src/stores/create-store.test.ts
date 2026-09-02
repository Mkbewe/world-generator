import { createStore } from './create-store';

interface TestState {
  count: number;
  increment: () => void;
  reset: () => void;
}

function createTestStore() {
  return createStore<TestState>(set => ({
    count: 0,
    increment: () => set(state => ({ count: state.count + 1 })),
    reset: () => set({ count: 0 }),
  }));
}

describe('createStore', () => {
  it('should create a store with the initial state', () => {
    const useTestStore = createTestStore();

    expect(useTestStore.getState().count).toBe(0);
  });

  it('should update the state through actions', () => {
    const useTestStore = createTestStore();

    useTestStore.getState().increment();
    useTestStore.getState().increment();

    expect(useTestStore.getState().count).toBe(2);
  });

  it('should replace the state on reset', () => {
    const useTestStore = createTestStore();

    useTestStore.getState().increment();
    useTestStore.getState().reset();

    expect(useTestStore.getState().count).toBe(0);
  });

  it('should notify subscribers about state changes', () => {
    const useTestStore = createTestStore();
    const listener = vi.fn();
    const unsubscribe = useTestStore.subscribe(listener);

    useTestStore.getState().increment();
    unsubscribe();

    expect(listener).toHaveBeenCalledTimes(1);
  });
});

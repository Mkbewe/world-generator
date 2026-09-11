import type { MapLayer } from './layer';
import { LayerQueue } from './layer-queue';

function token(id: string): MapLayer {
  return { id } as unknown as MapLayer;
}

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>(complete => {
    resolve = complete;
  });
  return { promise, resolve };
}

describe('LayerQueue', () => {
  it('loads and presents layers in enqueue order', async () => {
    const order: string[] = [];
    const queue = new LayerQueue({
      signal: () => new AbortController().signal,
      load: async layer => {
        order.push(`load:${layer.id}`);
      },
      present: layer => order.push(`present:${layer.id}`),
      fail: vi.fn(),
    });

    queue.enqueue(token('world-shape'));
    queue.enqueue(token('noise'));
    await queue.ready;

    expect(order).toEqual([
      'load:world-shape',
      'present:world-shape',
      'load:noise',
      'present:noise',
    ]);
  });

  it('processes layers enqueued while a load is in flight', async () => {
    const first = deferred();
    const order: string[] = [];
    const queue = new LayerQueue({
      signal: () => new AbortController().signal,
      load: async layer => {
        order.push(`load:${layer.id}`);
        if (layer.id === 'world-shape') {
          await first.promise;
        }
      },
      present: layer => order.push(`present:${layer.id}`),
      fail: vi.fn(),
    });

    queue.enqueue(token('world-shape'));
    queue.enqueue(token('noise'));
    first.resolve();
    await queue.ready;

    expect(order).toEqual([
      'load:world-shape',
      'present:world-shape',
      'load:noise',
      'present:noise',
    ]);
  });

  it('continues after a failed layer', async () => {
    const present = vi.fn();
    const fail = vi.fn();
    const queue = new LayerQueue({
      signal: () => new AbortController().signal,
      load: async layer => {
        if (layer.id === 'world-shape') {
          throw new Error('boom');
        }
      },
      present,
      fail,
    });

    queue.enqueue(token('world-shape'));
    queue.enqueue(token('noise'));
    await queue.ready;

    expect(fail).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'world-shape' }),
      expect.any(Error)
    );
    expect(present).toHaveBeenCalledTimes(1);
    expect(present).toHaveBeenCalledWith(expect.objectContaining({ id: 'noise' }));
  });

  it('ignores stale work after reset', async () => {
    const pending = deferred();
    const present = vi.fn();
    const fail = vi.fn();
    const controller = new AbortController();
    const queue = new LayerQueue({
      signal: () => controller.signal,
      load: () => pending.promise,
      present,
      fail,
    });

    queue.enqueue(token('world-shape'));
    controller.abort();
    queue.reset();
    pending.resolve();
    await queue.ready;

    expect(present).not.toHaveBeenCalled();
    expect(fail).not.toHaveBeenCalled();
  });
});

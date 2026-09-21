import type { MapLayer } from './layer';

export interface LayerQueueHandlers {
  /** Signal for the current run; a fresh one is created per renderer session. */
  signal(): AbortSignal;
  /** Called when a layer's preparation starts, before `load`. */
  begin?(layer: MapLayer, silent: boolean): void;
  /** Prepares (renders) a layer, optionally reporting progressive tiles. */
  load(layer: MapLayer, signal: AbortSignal): Promise<void>;
  /** Called after a layer is ready and the run is still current. */
  present(layer: MapLayer, silent: boolean): void;
  /** Called when preparation fails; the layer is handed over for cleanup. */
  fail(layer: MapLayer, error: unknown): void;
}

interface PendingLayer {
  readonly layer: MapLayer;
  readonly silent: boolean;
}

export class LayerQueue {
  private readonly pending: PendingLayer[] = [];
  private pumping = false;
  private run = 0;
  private task = Promise.resolve();

  constructor(private readonly handlers: LayerQueueHandlers) {}

  get ready(): Promise<void> {
    return this.task;
  }

  /** Silent layers are prepared and marked ready without becoming the displayed one. */
  enqueue(layer: MapLayer, silent = false): void {
    this.pending.push({ layer, silent });
    this.schedule();
  }

  reset(): void {
    this.run += 1;
    this.pumping = false;
    this.pending.length = 0;
  }

  private schedule(): void {
    if (this.pumping) {
      return;
    }
    this.pumping = true;
    const run = this.run;
    this.task = this.drain(run).finally(() => {
      if (this.run !== run) {
        return;
      }
      this.pumping = false;
      if (this.pending.length > 0 && !this.handlers.signal().aborted) {
        this.schedule();
      }
    });
  }

  private async drain(run: number): Promise<void> {
    const signal = this.handlers.signal();
    while (this.pending.length > 0 && this.run === run && !signal.aborted) {
      const { layer, silent } = this.pending.shift()!;
      this.handlers.begin?.(layer, silent);
      try {
        await this.handlers.load(layer, signal);
        if (this.run !== run || signal.aborted) {
          return;
        }
        this.handlers.present(layer, silent);
      } catch (error) {
        if (this.run !== run || signal.aborted) {
          return;
        }
        this.handlers.fail(layer, error);
      }
    }
  }
}

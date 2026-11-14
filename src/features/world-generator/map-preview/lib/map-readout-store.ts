import type { InspectorReadout } from '@readout';

export interface MapReadoutState {
  readonly readout?: InspectorReadout;
  readonly pinned: boolean;
}

export class MapReadoutStore {
  private state: MapReadoutState = { readout: undefined, pinned: false };
  private readonly listeners = new Set<() => void>();

  readonly getSnapshot = (): MapReadoutState => this.state;

  readonly subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  setReadout(readout: InspectorReadout): void {
    this.update({ ...this.state, readout });
  }

  togglePinned(readout: InspectorReadout): void {
    this.update({ readout, pinned: !this.state.pinned });
  }

  clear(): void {
    if (this.state.readout === undefined) {
      return;
    }
    this.update({ ...this.state, readout: undefined });
  }

  isPinned(): boolean {
    return this.state.pinned;
  }

  private update(state: MapReadoutState): void {
    this.state = state;
    for (const listener of this.listeners) {
      listener();
    }
  }
}

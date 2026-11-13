import { layerRegistry, mapPersistence, type MapRenderer } from '@renderer';
import type { LayerDataRecord, MapInfo, MapRasters } from '@layers';

import type {
  WorldGenerationRun,
  WorldGenerationStageUpdate,
} from '../../../application/world-generation';
import { usePreviewStore } from '../../../stores';

export class WorldGenerationPreview {
  private renderer?: MapRenderer;
  private run?: WorldGenerationRun;
  private info: MapInfo = {};
  private layers: MapRasters = {};
  private followRun = false;
  private activeRunId?: number;

  attach(renderer: MapRenderer): void {
    this.renderer = renderer;
    const run = this.run;
    if (!run) {
      mapPersistence.restore(renderer);
      return;
    }
    this.startRenderer(renderer, run);
    this.replay(renderer);
  }

  detach(): void {
    this.renderer = undefined;
  }

  begin(runId: number, run: WorldGenerationRun, layers: MapRasters): void {
    this.activeRunId = runId;
    this.run = run;
    this.info = run.info;
    this.layers = layers;
    const renderer = this.renderer;
    if (renderer) {
      this.startRenderer(renderer, run);
    }
    this.followRun = !renderer?.state.displayedLayer;
  }

  receive(runId: number, update: WorldGenerationStageUpdate): void {
    if (this.activeRunId !== runId) {
      return;
    }
    this.layers = update.layers;
    if (update.info) {
      this.info = update.info;
      this.renderer?.setInfo(this.info);
    }
    if (this.followRun) {
      const displayed = layerRegistry.presentIn(update.rasters).at(-1);
      if (displayed) {
        usePreviewStore.getState().setBaseLayer(displayed);
      }
    }
    const renderer = this.renderer;
    if (!renderer || renderer.signal.aborted) {
      return;
    }
    renderer.setOverlayData(this.layers);
    this.send(renderer, update.rasters);
  }

  finish(runId: number): void {
    const activeRunId = this.activeRunId;
    if (activeRunId === undefined || activeRunId > runId) {
      return;
    }
    this.activeRunId = undefined;
    this.run = undefined;
    this.info = {};
    this.layers = {};
    this.followRun = false;
  }

  reset(): void {
    this.activeRunId = undefined;
    this.run = undefined;
    this.info = {};
    this.layers = {};
    this.followRun = false;
  }

  private startRenderer(renderer: MapRenderer, run: WorldGenerationRun): void {
    renderer.start(
      { width: run.width, height: run.height },
      run.shape,
      run.regionGeometry,
      run.dimensionsMeters
    );
    renderer.setInfo(this.info);
    renderer.setOverlayData(this.layers);
  }

  private replay(renderer: MapRenderer): void {
    const values: LayerDataRecord = this.layers;
    renderer.setOverlayData(values);
    const ids = layerRegistry.presentIn(values);
    for (const [index, id] of ids.entries()) {
      const silent = index < ids.length - 1;
      renderer.add(id, values[layerRegistry.get(id).source], silent);
    }
  }

  private send(renderer: MapRenderer, values: LayerDataRecord): void {
    for (const id of layerRegistry.presentIn(values)) {
      renderer.add(id, values[layerRegistry.get(id).source]);
    }
  }
}

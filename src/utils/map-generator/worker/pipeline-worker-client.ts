import type {
  PipelineWorkerGenerationResult,
  PipelineWorkerRequest,
  PipelineWorkerResponse,
} from './pipeline-worker.types';
import type { GenerationEvent, MapConfig } from '../types';

interface PendingRequest {
  resolve: (result: PipelineWorkerGenerationResult) => void;
  reject: (error: Error) => void;
  onEvent?: (event: GenerationEvent) => void;
}

export class PipelineWorkerClient {
  private worker?: Worker;
  private nextRequestId = 1;
  private readonly pendingRequests = new Map<number, PendingRequest>();

  generate(
    config: MapConfig,
    options: { onEvent?: (event: GenerationEvent) => void } = {}
  ): Promise<PipelineWorkerGenerationResult> {
    const requestId = this.nextRequestId++;
    const request: PipelineWorkerRequest = {
      type: 'generate',
      requestId,
      config,
    };

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(requestId, { resolve, reject, onEvent: options.onEvent });
      this.getWorker().postMessage(request);
    });
  }

  dispose(): void {
    this.worker?.terminate();
    this.worker = undefined;
    this.rejectPendingRequests(new Error('Pipeline worker was disposed.'));
  }

  private getWorker(): Worker {
    if (this.worker) {
      return this.worker;
    }

    const worker = new Worker(new URL('./pipeline.worker.ts', import.meta.url), {
      type: 'module',
    });

    worker.addEventListener('message', this.handleMessage);
    worker.addEventListener('error', this.handleWorkerError);
    this.worker = worker;
    return worker;
  }

  private readonly handleMessage = (event: MessageEvent<PipelineWorkerResponse>): void => {
    const response = event.data;
    const pendingRequest = this.pendingRequests.get(response.requestId);

    if (!pendingRequest) {
      return;
    }

    if (
      response.type === 'stage-started' ||
      response.type === 'stage-progress' ||
      response.type === 'stage-completed' ||
      response.type === 'stage-failed'
    ) {
      try {
        pendingRequest.onEvent?.(response);
      } catch (error) {
        this.pendingRequests.delete(response.requestId);
        pendingRequest.reject(error instanceof Error ? error : new Error(String(error)));
      }
      return;
    }

    this.pendingRequests.delete(response.requestId);
    if (response.type === 'result') {
      pendingRequest.resolve(response.result);
    } else {
      pendingRequest.reject(new Error(response.message));
    }
  };

  private readonly handleWorkerError = (): void => {
    this.worker?.terminate();
    this.worker = undefined;
    this.rejectPendingRequests(new Error('Pipeline worker failed.'));
  };

  private rejectPendingRequests(error: Error): void {
    for (const pendingRequest of this.pendingRequests.values()) {
      pendingRequest.reject(error);
    }
    this.pendingRequests.clear();
  }
}

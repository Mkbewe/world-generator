import type {
  LegacyWorldGenerationWorkerRequest,
  LegacyWorldGenerationWorkerResponse,
  LegacyWorldGenerationWorkerResult,
} from './legacy-world-generation-worker.types';
import type { Params } from '../../types/world.types';

interface PendingRequest {
  resolve: (result: LegacyWorldGenerationWorkerResult) => void;
  reject: (error: Error) => void;
}

export class LegacyWorldGenerationWorkerClient {
  private worker?: Worker;
  private nextRequestId = 1;
  private readonly pendingRequests = new Map<number, PendingRequest>();

  generate(
    width: number,
    height: number,
    params: Params
  ): Promise<LegacyWorldGenerationWorkerResult> {
    const requestId = this.nextRequestId++;
    const request: LegacyWorldGenerationWorkerRequest = {
      type: 'generate',
      requestId,
      width,
      height,
      params,
    };

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(requestId, { resolve, reject });
      this.getWorker().postMessage(request);
    });
  }

  dispose(): void {
    this.worker?.terminate();
    this.worker = undefined;
    this.rejectPendingRequests(new Error('World generation worker was disposed.'));
  }

  private getWorker(): Worker {
    if (this.worker) {
      return this.worker;
    }

    const worker = new Worker(new URL('./legacy-world-generation.worker.ts', import.meta.url), {
      type: 'module',
    });

    worker.addEventListener('message', this.handleMessage);
    worker.addEventListener('error', this.handleWorkerError);
    this.worker = worker;
    return worker;
  }

  private readonly handleMessage = (
    event: MessageEvent<LegacyWorldGenerationWorkerResponse>
  ): void => {
    const response = event.data;
    const pendingRequest = this.pendingRequests.get(response.requestId);

    if (!pendingRequest) {
      return;
    }

    this.pendingRequests.delete(response.requestId);
    if (response.type === 'result') {
      pendingRequest.resolve(response);
    } else {
      pendingRequest.reject(new Error(response.message));
    }
  };

  private readonly handleWorkerError = (): void => {
    this.worker?.terminate();
    this.worker = undefined;
    this.rejectPendingRequests(new Error('World generation worker failed.'));
  };

  private rejectPendingRequests(error: Error): void {
    for (const request of this.pendingRequests.values()) {
      request.reject(error);
    }
    this.pendingRequests.clear();
  }
}

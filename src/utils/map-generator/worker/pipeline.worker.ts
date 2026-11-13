import { isGenerationWorkerScope, startGenerationWorker } from './generation-worker';

if (!isGenerationWorkerScope(globalThis)) {
  throw new Error('Generation worker scope is not available.');
}
startGenerationWorker(globalThis);

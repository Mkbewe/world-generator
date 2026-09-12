import { type GenerationWorkerScope, startGenerationWorker } from './generation-worker';

startGenerationWorker(globalThis as unknown as GenerationWorkerScope);

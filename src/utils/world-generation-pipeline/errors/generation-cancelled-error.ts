export class GenerationCancelledError extends Error {
  constructor() {
    super('World generation was cancelled.');
    this.name = 'GenerationCancelledError';
  }
}

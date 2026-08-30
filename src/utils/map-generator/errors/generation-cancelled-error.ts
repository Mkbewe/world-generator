export class GenerationCancelledError extends Error {
  constructor() {
    super('Map generation was cancelled.');
    this.name = 'GenerationCancelledError';
  }
}

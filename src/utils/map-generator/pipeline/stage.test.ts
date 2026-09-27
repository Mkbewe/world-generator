import { assertStageOutput } from './stage';

describe('assertStageOutput', () => {
  it('accepts a typed array of the expected kind and size', () => {
    expect(() => assertStageOutput(new Uint8Array(4), 'uint8', 4)).not.toThrow();
    expect(() => assertStageOutput(new Float32Array(4), 'float32', 4)).not.toThrow();
    expect(() => assertStageOutput(new Int16Array(4), 'int16', 4)).not.toThrow();
  });

  it('rejects a missing output, a wrong kind or a wrong size', () => {
    expect(() => assertStageOutput(undefined, 'uint8', 4)).toThrow('required map data');
    expect(() => assertStageOutput(new Uint8Array(4), 'float32', 4)).toThrow('required map data');
    expect(() => assertStageOutput(new Uint8Array(2), 'uint8', 4)).toThrow('required map data');
  });
});

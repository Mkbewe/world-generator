import { isOneOf } from './option-value';

describe('isOneOf', () => {
  it('narrows supported option values', () => {
    const options = ['top', 'bottom'] as const;

    expect(isOneOf('top', options)).toBe(true);
    expect(isOneOf('middle', options)).toBe(false);
  });
});

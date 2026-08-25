import { render } from '@testing-library/react';

import { WorldCanvas } from './world-canvas';
import type { Params } from '../types';

const params: Params = {
  largeCount: 3,
  mediumCount: 5,
  smallCount: 10,
  islandSize: 100,
  groupChance: 40,
  seaLevel: 0.38,
  roughness: 100,
  seed: '',
};

describe('WorldCanvas', () => {
  it('should render successfully', () => {
    const { container } = render(<WorldCanvas params={params} onSeedGenerated={() => {}} />);
    expect(container).toBeTruthy();
  });
});

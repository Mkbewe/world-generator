import { Theme } from '@radix-ui/themes';
import { render } from '@testing-library/react';

import { WorldControls } from './world-controls';

describe('WorldControls', () => {
  const mockParams = {
    largeCount: 3,
    mediumCount: 5,
    smallCount: 10,
    islandSize: 100,
    groupChance: 40,
    seaLevel: 0.38,
    roughness: 100,
    seed: '12345',
  };

  const mockUpdateParam = vi.fn();
  const mockGenerateMap = vi.fn();

  it('should render successfully', () => {
    const { container } = render(
      <Theme>
        <WorldControls
          params={mockParams}
          updateParam={mockUpdateParam}
          generateMap={mockGenerateMap}
        />
      </Theme>
    );
    expect(container).toBeTruthy();
  });
});

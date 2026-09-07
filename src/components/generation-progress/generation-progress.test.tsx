import { Theme } from '@radix-ui/themes';
import { render, screen } from '@testing-library/react';

import { GenerationProgress } from './generation-progress';

describe('GenerationProgress', () => {
  it('shows the active stage position and percentage', () => {
    render(
      <Theme>
        <GenerationProgress
          progress={{
            stageName: 'Generating shape',
            stageIndex: 0,
            stageCount: 3,
            percentage: 50,
            status: 'running',
          }}
        />
      </Theme>
    );

    expect(screen.getByText('Generating shape:')).toBeInTheDocument();
    expect(screen.getByText('Stage 1 of 3')).toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'Generating shape progress' })).toHaveValue(50);
  });
});

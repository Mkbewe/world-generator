import { Theme } from '@radix-ui/themes';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

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
          isGenerating={false}
          useWorker={false}
          onUseWorkerChange={vi.fn()}
        />
      </Theme>
    );
    expect(container).toBeTruthy();
  });

  it('changes the Web Worker generation mode', async () => {
    const user = userEvent.setup();
    const onUseWorkerChange = vi.fn();

    render(
      <Theme>
        <WorldControls
          params={mockParams}
          updateParam={mockUpdateParam}
          generateMap={mockGenerateMap}
          isGenerating={false}
          useWorker={false}
          onUseWorkerChange={onUseWorkerChange}
        />
      </Theme>
    );

    await user.click(screen.getByRole('switch', { name: 'Generate in Web Worker' }));

    expect(onUseWorkerChange).toHaveBeenCalledWith(true);
  });

  it('disables generation controls and shows a spinner while generating', () => {
    const { container } = render(
      <Theme>
        <WorldControls
          params={mockParams}
          updateParam={mockUpdateParam}
          generateMap={mockGenerateMap}
          isGenerating
          useWorker
          onUseWorkerChange={vi.fn()}
        />
      </Theme>
    );

    expect(screen.getByRole('button', { name: 'Generate' })).toBeDisabled();
    expect(screen.getByRole('switch', { name: 'Generate in Web Worker' })).toBeDisabled();
    expect(container.querySelector('.rt-Spinner')).toBeInTheDocument();
  });

  it('shows the last generation measurements', () => {
    render(
      <Theme>
        <WorldControls
          params={mockParams}
          updateParam={mockUpdateParam}
          generateMap={mockGenerateMap}
          isGenerating={false}
          useWorker
          onUseWorkerChange={vi.fn()}
          generationMetrics={{
            mode: 'worker',
            computeDurationMs: 120.45,
            totalDurationMs: 145.67,
            islandCounts: { large: 3, medium: 5, small: 10 },
          }}
        />
      </Theme>
    );

    expect(screen.getByText('Last generation')).toBeInTheDocument();
    expect(screen.getByText('Web Worker')).toBeInTheDocument();
    expect(screen.getByText('120.5 ms')).toBeInTheDocument();
    expect(screen.getByText('145.7 ms')).toBeInTheDocument();
    expect(screen.getByText('3 large / 5 medium / 10 small (18)')).toBeInTheDocument();
  });

  it('renders the export button when an export handler is provided', () => {
    render(
      <Theme>
        <WorldControls
          params={mockParams}
          updateParam={mockUpdateParam}
          generateMap={mockGenerateMap}
          isGenerating={false}
          useWorker
          onUseWorkerChange={vi.fn()}
          onExport={vi.fn()}
          canExport
        />
      </Theme>
    );

    expect(screen.getByRole('button', { name: 'Export PNG' })).toBeInTheDocument();
  });

  it('disables the export button until a map is generated', () => {
    render(
      <Theme>
        <WorldControls
          params={mockParams}
          updateParam={mockUpdateParam}
          generateMap={mockGenerateMap}
          isGenerating={false}
          useWorker
          onUseWorkerChange={vi.fn()}
          onExport={vi.fn()}
          canExport={false}
        />
      </Theme>
    );

    expect(screen.getByRole('button', { name: 'Export PNG' })).toBeDisabled();
  });

  it('calls the export handler when the export button is clicked', async () => {
    const user = userEvent.setup();
    const onExport = vi.fn();

    render(
      <Theme>
        <WorldControls
          params={mockParams}
          updateParam={mockUpdateParam}
          generateMap={mockGenerateMap}
          isGenerating={false}
          useWorker
          onUseWorkerChange={vi.fn()}
          onExport={onExport}
          canExport
        />
      </Theme>
    );

    await user.click(screen.getByRole('button', { name: 'Export PNG' }));

    expect(onExport).toHaveBeenCalledTimes(1);
  });

  it('does not render the export button without an export handler', () => {
    render(
      <Theme>
        <WorldControls
          params={mockParams}
          updateParam={mockUpdateParam}
          generateMap={mockGenerateMap}
          isGenerating={false}
          useWorker
          onUseWorkerChange={vi.fn()}
        />
      </Theme>
    );

    expect(screen.queryByRole('button', { name: 'Export PNG' })).not.toBeInTheDocument();
  });
});

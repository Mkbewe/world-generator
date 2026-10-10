import { MemoryRouter } from 'react-router';
import { Theme } from '@radix-ui/themes';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { StatisticsPage } from './statistics-page';
import {
  useGenerationStatisticsStore,
  useMapConfigStore,
  useRenderStatisticsStore,
} from '../../stores';
import type { StageStatistics } from '../../utils/map-generator';

function createStage(overrides: Partial<StageStatistics> = {}): StageStatistics {
  return {
    stageId: 'macro-region',
    stageName: 'Macro region',
    status: 'completed',
    startedAt: 0,
    finishedAt: 20.4,
    durationMs: 20.4,
    ...overrides,
  };
}

function renderPage() {
  return render(
    <MemoryRouter>
      <Theme>
        <StatisticsPage />
      </Theme>
    </MemoryRouter>
  );
}

describe('StatisticsPage', () => {
  beforeEach(() => {
    useGenerationStatisticsStore.setState({ result: undefined });
    useMapConfigStore.setState({ config: undefined });
    useRenderStatisticsStore.setState({ statistics: undefined });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders an empty state when there are no statistics yet', () => {
    renderPage();

    expect(screen.getByRole('heading', { name: 'No statistics yet' })).toBeInTheDocument();
    expect(screen.getByText('Generate a world to see pipeline statistics.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to generator' })).toHaveAttribute('href', '/');
    expect(screen.queryByRole('button', { name: 'Export' })).not.toBeInTheDocument();
  });

  it('renders map and generation statistics when present', () => {
    useGenerationStatisticsStore.setState({
      result: {
        statistics: [
          createStage({
            stageId: 'world-shape',
            stageName: 'World shape',
            durationMs: 12.5,
          }),
          createStage(),
        ],
        totalDurationMs: 40,
      },
    });
    useMapConfigStore.setState({
      config: {
        world: {
          dimensions: { widthMeters: 10, heightMeters: 10, sampleWidth: 10, sampleHeight: 10 },
          seed: 123456,
          shape: 'disc',
        },
      },
    });

    renderPage();

    expect(screen.getByRole('heading', { name: 'Map' })).toBeInTheDocument();
    expect(screen.getByText('123456')).toBeInTheDocument();
    expect(screen.getByText('10 × 10 m')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Generation' })).toBeInTheDocument();
    expect(screen.getByText('World shape')).toBeInTheDocument();
    expect(screen.getByText('Macro region')).toBeInTheDocument();
    expect(screen.getByText('12.5 ms')).toBeInTheDocument();
    expect(screen.getAllByText('40.0 ms')).toHaveLength(2);
    expect(screen.queryByText('No statistics yet')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Export' })).toBeInTheDocument();
  });

  it('exports the statistics as a JSON file', async () => {
    const user = userEvent.setup();
    useGenerationStatisticsStore.setState({
      result: { statistics: [createStage()], totalDurationMs: 40 },
    });
    useMapConfigStore.setState({
      config: {
        world: {
          dimensions: { widthMeters: 10, heightMeters: 10, sampleWidth: 10, sampleHeight: 10 },
          seed: 123456,
          shape: 'disc',
        },
      },
    });
    const createObjectURL = vi.fn(() => 'blob:statistics');
    const revokeObjectURL = vi.fn();
    URL.createObjectURL = createObjectURL;
    URL.revokeObjectURL = revokeObjectURL;
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    renderPage();

    await user.click(screen.getByRole('button', { name: 'Export' }));

    const dialog = screen.getByRole('alertdialog');
    expect(within(dialog).getByText('Export Statistics')).toBeInTheDocument();

    await user.click(within(dialog).getByRole('button', { name: 'Export' }));

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(click).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:statistics');
  });
});

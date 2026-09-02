import { Theme } from '@radix-ui/themes';
import { render, screen } from '@testing-library/react';

import { GenerationStatistics } from './generation-statistics';
import type { StageStatistics } from '../../utils/map-generator';

function createStatistics(overrides: Partial<StageStatistics> = {}): StageStatistics {
  return {
    stageId: 'world-shape',
    stageName: 'World shape generation',
    status: 'completed',
    startedAt: 0,
    finishedAt: 12.5,
    durationMs: 12.5,
    ...overrides,
  };
}

function renderStatistics(statistics: readonly StageStatistics[], totalDurationMs?: number) {
  return render(
    <Theme>
      <GenerationStatistics statistics={statistics} totalDurationMs={totalDurationMs} />
    </Theme>
  );
}

describe('GenerationStatistics', () => {
  it('renders an empty table with a total row', () => {
    renderStatistics([]);

    expect(screen.getByRole('heading', { name: 'Statistics' })).toBeInTheDocument();
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Stage' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Time' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Details' })).toBeInTheDocument();
    expect(screen.getByText('Total')).toBeInTheDocument();
  });

  it('renders stage rows with their names and durations', () => {
    renderStatistics([
      createStatistics({ stageId: 'world-shape', stageName: 'World shape generation' }),
      createStatistics({ stageId: 'noise', stageName: 'Noise generation', durationMs: 20.4 }),
    ]);

    expect(screen.getByText('World shape generation')).toBeInTheDocument();
    expect(screen.getByText('Noise generation')).toBeInTheDocument();
    expect(screen.getByText('12.5 ms')).toBeInTheDocument();
    expect(screen.getByText('20.4 ms')).toBeInTheDocument();
  });

  it('shows a dash for an undefined duration', () => {
    renderStatistics([createStatistics({ durationMs: undefined })]);

    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(2);
  });

  it('formats numeric details with three decimals', () => {
    renderStatistics([
      createStatistics({
        details: { min: 0.5, max: 0.75 },
      }),
    ]);

    expect(screen.getByText('min 0.500, max 0.750')).toBeInTheDocument();
  });

  it('renders string details as-is', () => {
    renderStatistics([
      createStatistics({
        details: { method: 'simplex' },
      }),
    ]);

    expect(screen.getByText('method simplex')).toBeInTheDocument();
  });

  it('shows a dash when details are missing or empty', () => {
    const { rerender } = renderStatistics([
      createStatistics(), // no details
    ]);

    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(1);

    rerender(
      <Theme>
        <GenerationStatistics statistics={[createStatistics({ details: {} })]} />
      </Theme>
    );

    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(1);
  });

  it('renders the total duration', () => {
    renderStatistics([createStatistics()], 20.4);

    expect(screen.getByText('20.4 ms')).toBeInTheDocument();
  });

  it('shows a dash for an undefined total duration', () => {
    renderStatistics([createStatistics()]);

    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(1);
  });
});

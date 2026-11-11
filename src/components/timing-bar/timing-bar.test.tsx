import { Theme } from '@radix-ui/themes';
import { render, screen } from '@testing-library/react';

import { TimingBar } from './timing-bar';

describe('TimingBar', () => {
  it('renders a segment and legend entry per non-zero duration', () => {
    render(
      <Theme>
        <TimingBar
          segments={[
            { key: 'a', nameKey: 'stages.worldShape', durationMs: 30 },
            { key: 'b', nameKey: 'stages.macroRegion', durationMs: 0 },
            { key: 'c', nameKey: 'statistics.generation.overhead', durationMs: 20, muted: true },
          ]}
        />
      </Theme>
    );

    expect(screen.getByText('Timing')).toBeInTheDocument();
    expect(screen.getByText('World shape · 30.0 ms')).toBeInTheDocument();
    expect(screen.getByText('Overhead · 20.0 ms')).toBeInTheDocument();
    expect(screen.queryByText('Macro region · 0.0 ms')).not.toBeInTheDocument();
    expect(screen.getByText('60%')).toBeInTheDocument();
    expect(screen.getByText('40%')).toBeInTheDocument();
  });

  it('hides the percentage when a segment is too narrow', () => {
    render(
      <Theme>
        <TimingBar
          segments={[
            { key: 'a', nameKey: 'stages.worldShape', durationMs: 99 },
            { key: 'b', nameKey: 'stages.macroRegion', durationMs: 1 },
          ]}
        />
      </Theme>
    );

    expect(screen.getByText('99%')).toBeInTheDocument();
    expect(screen.queryByText('1%')).not.toBeInTheDocument();
  });

  it('renders nothing without durations', () => {
    render(
      <Theme>
        <TimingBar segments={[{ key: 'a', nameKey: 'stages.worldShape', durationMs: 0 }]} />
      </Theme>
    );

    expect(screen.queryByText('Timing')).not.toBeInTheDocument();
  });
});

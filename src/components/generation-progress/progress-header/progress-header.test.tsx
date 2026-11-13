import { Theme } from '@radix-ui/themes';
import { act, render, screen } from '@testing-library/react';

import { ProgressHeader } from './progress-header';
import { i18n, i18nReady } from '../../../i18n';

describe('ProgressHeader', () => {
  beforeAll(async () => {
    await i18nReady;
  });

  afterEach(async () => {
    await act(async () => {
      await i18n.changeLanguage('en');
    });
  });

  it('shows the status, count and formatted time', () => {
    render(
      <Theme>
        <ProgressHeader status='running' completed={1} total={3} skipped={0} time={1500} />
      </Theme>
    );

    expect(screen.getByText('Generating')).toBeInTheDocument();
    expect(screen.getByText('1 / 3')).toBeInTheDocument();
    expect(screen.getByText('1.5 s')).toBeInTheDocument();
  });

  it('mentions reused stages in the counter', () => {
    render(
      <Theme>
        <ProgressHeader status='completed' completed={2} total={3} skipped={1} time={460} />
      </Theme>
    );

    expect(screen.getByText('2 / 3 · skipped: 1')).toBeInTheDocument();
  });

  it('shows the failed state with milliseconds', () => {
    render(
      <Theme>
        <ProgressHeader status='failed' completed={1} total={2} skipped={0} time={340} />
      </Theme>
    );

    expect(screen.getByText('Failed')).toBeInTheDocument();
    expect(screen.getByText('1 / 2')).toBeInTheDocument();
    expect(screen.getByText('340 ms')).toBeInTheDocument();
  });

  it('localizes the labels through the active catalogue', async () => {
    await i18n.changeLanguage('pl');

    render(
      <Theme>
        <ProgressHeader status='completed' completed={2} total={3} skipped={1} time={460} />
      </Theme>
    );

    expect(screen.getByText('Gotowe')).toBeInTheDocument();
    expect(screen.getByText('2 / 3 · pominięto: 1')).toBeInTheDocument();
  });
});

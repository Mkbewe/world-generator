import { Theme } from '@radix-ui/themes';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { MeasureControls } from './measure-controls';

function renderControls(overrides: Partial<Parameters<typeof MeasureControls>[0]> = {}) {
  const props = {
    measuring: true,
    onToggleMeasuring: vi.fn(),
    ...overrides,
  };
  render(
    <Theme>
      <MeasureControls {...props} />
    </Theme>
  );
  return props;
}

describe('MeasureControls', () => {
  it('shows the controls section with the active measure mode', () => {
    renderControls();

    expect(screen.getByText('Controls')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /measure/i })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
  });

  it('toggles the measure mode', async () => {
    const user = userEvent.setup();
    const props = renderControls({ measuring: false });

    const button = screen.getByRole('button', { name: /measure/i });
    expect(button).toHaveAttribute('aria-pressed', 'false');
    await user.click(button);

    expect(props.onToggleMeasuring).toHaveBeenCalledOnce();
  });
});

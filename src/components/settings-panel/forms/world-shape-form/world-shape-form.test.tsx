import { Theme } from '@radix-ui/themes';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { WorldShapeForm } from './world-shape-form';

interface RenderOptions {
  shape?: 'disc' | 'rectangle';
  size?: number;
}

function renderForm({ shape = 'disc', size = 600 }: RenderOptions = {}) {
  const onShapeChange = vi.fn();
  const onSizeChange = vi.fn();
  render(
    <Theme>
      <WorldShapeForm
        shape={shape}
        size={size}
        onShapeChange={onShapeChange}
        onSizeChange={onSizeChange}
      />
    </Theme>
  );
  return { onShapeChange, onSizeChange };
}

describe('WorldShapeForm', () => {
  it('reports the selected shape', async () => {
    const user = userEvent.setup();
    const { onShapeChange } = renderForm();

    await user.click(screen.getByRole('radio', { name: 'Rectangle' }));

    expect(onShapeChange).toHaveBeenCalledWith('rectangle');
  });

  it('applies a size preset and shows its dimensions', async () => {
    const user = userEvent.setup();
    const { onSizeChange } = renderForm();

    expect(screen.getByText('600 × 600 px')).toBeInTheDocument();

    await user.click(screen.getByRole('radio', { name: 'Medium' }));

    expect(onSizeChange).toHaveBeenCalledWith(2400);
  });

  it('commits a custom size on blur, clamped to the allowed range', async () => {
    const user = userEvent.setup();
    const { onSizeChange } = renderForm();

    const input = screen.getByLabelText('Custom size:');
    await user.clear(input);
    await user.type(input, '50');
    await user.tab();

    expect(onSizeChange).toHaveBeenCalledWith(100);
  });

  it('commits an in-range custom size on Enter', async () => {
    const user = userEvent.setup();
    const { onSizeChange } = renderForm();

    const input = screen.getByLabelText('Custom size:');
    await user.clear(input);
    await user.type(input, '2500{Enter}');

    expect(onSizeChange).toHaveBeenCalledWith(2500);
  });
});

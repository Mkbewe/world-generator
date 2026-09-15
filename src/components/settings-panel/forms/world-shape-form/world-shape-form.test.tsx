import { Theme } from '@radix-ui/themes';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { WorldShapeForm } from './world-shape-form';

interface RenderOptions {
  shape?: 'disc' | 'rectangle';
  sizeMeters?: number;
  metersPerSample?: number;
}

function renderForm({
  shape = 'disc',
  sizeMeters = 1000,
  metersPerSample = 1,
}: RenderOptions = {}) {
  const onShapeChange = vi.fn();
  const onSizeChange = vi.fn();
  const onDetailChange = vi.fn();
  render(
    <Theme>
      <WorldShapeForm
        shape={shape}
        sizeMeters={sizeMeters}
        metersPerSample={metersPerSample}
        onShapeChange={onShapeChange}
        onSizeChange={onSizeChange}
        onDetailChange={onDetailChange}
      />
    </Theme>
  );
  return { onShapeChange, onSizeChange, onDetailChange };
}

describe('WorldShapeForm', () => {
  it('reports the selected shape', async () => {
    const user = userEvent.setup();
    const { onShapeChange } = renderForm();

    await user.click(screen.getByRole('radio', { name: 'Rectangle' }));

    expect(onShapeChange).toHaveBeenCalledWith('rectangle');
  });

  it('shows the derived grid and applies a size preset', async () => {
    const user = userEvent.setup();
    const { onSizeChange } = renderForm();

    expect(screen.getByText('1000 × 1000 samples · 6 MB')).toBeInTheDocument();

    await user.click(screen.getByRole('radio', { name: 'Medium' }));

    expect(onSizeChange).toHaveBeenCalledWith(2000);
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

  it('reports the selected terrain detail', async () => {
    const user = userEvent.setup();
    const { onDetailChange } = renderForm();

    await user.click(screen.getByRole('radio', { name: '2 m' }));

    expect(onDetailChange).toHaveBeenCalledWith(2);
  });

  it('warns when the sample budget clamps the requested detail', () => {
    renderForm({ sizeMeters: 10_000, metersPerSample: 0.5 });

    expect(screen.getByText('10000 × 10000 samples · 600 MB')).toBeInTheDocument();
    expect(screen.getByText(/limited to 1.0 m per sample/i)).toBeInTheDocument();
  });
});

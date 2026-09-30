import { Theme } from '@radix-ui/themes';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { SIZE_PRESETS } from './lib/size-presets';
import { TERRAIN_DETAIL_OPTIONS } from './lib/terrain-detail';
import { WorldShapeForm } from './world-shape-form';

interface RenderOptions {
  shape?: 'disc' | 'rectangle';
  sizeMeters?: number;
  metersPerSample?: number;
}

function renderForm({
  shape = 'disc',
  sizeMeters = 3000,
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

  it('applies every size preset from the shared list', async () => {
    const user = userEvent.setup();
    // A size outside the presets keeps every preset clickable.
    const { onSizeChange } = renderForm({ sizeMeters: 4500 });

    for (const preset of SIZE_PRESETS) {
      await user.click(screen.getByRole('radio', { name: preset.label }));
      expect(onSizeChange).toHaveBeenLastCalledWith(preset.sizeMeters);
    }
  });

  it('commits a custom size on blur, clamped to the allowed range', async () => {
    const user = userEvent.setup();
    const { onSizeChange } = renderForm({ sizeMeters: 4500 });

    const input = screen.getByLabelText('Custom size:');
    await user.clear(input);
    await user.type(input, '50');
    await user.tab();

    expect(onSizeChange).toHaveBeenCalledWith(3000);
  });

  it('commits an in-range custom size on Enter', async () => {
    const user = userEvent.setup();
    const { onSizeChange } = renderForm();

    const input = screen.getByLabelText('Custom size:');
    await user.clear(input);
    await user.type(input, '4500{Enter}');

    expect(onSizeChange).toHaveBeenCalledWith(4500);
  });

  it('reports every terrain detail option from the shared list', async () => {
    const user = userEvent.setup();
    // A detail outside the options keeps every option clickable.
    const { onDetailChange } = renderForm({ metersPerSample: 3 });

    for (const option of TERRAIN_DETAIL_OPTIONS) {
      await user.click(screen.getByRole('radio', { name: option.label }));
      expect(onDetailChange).toHaveBeenLastCalledWith(option.metersPerSample);
    }
  });
});

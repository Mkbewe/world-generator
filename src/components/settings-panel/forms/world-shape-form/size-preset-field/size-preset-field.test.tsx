import { Theme } from '@radix-ui/themes';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { SizePresetField } from './size-preset-field';
import { SIZE_PRESETS } from '../lib/size-presets';

function renderField(sizeMeters: number, onSelect: (sizeMeters: number) => void = () => {}) {
  render(
    <Theme>
      <SizePresetField sizeMeters={sizeMeters} onSelect={onSelect} />
    </Theme>
  );
}

describe('SizePresetField', () => {
  it('renders every preset from the shared list', () => {
    renderField(SIZE_PRESETS[0].sizeMeters);

    for (const preset of SIZE_PRESETS) {
      expect(screen.getByRole('radio', { name: preset.label })).toBeInTheDocument();
    }
  });

  it('marks the preset matching the current size', () => {
    const active = SIZE_PRESETS[1];
    renderField(active.sizeMeters);

    for (const preset of SIZE_PRESETS) {
      expect(screen.getByRole('radio', { name: preset.label })).toHaveAttribute(
        'aria-checked',
        String(preset === active)
      );
    }
  });

  it('reports the chosen preset size', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    renderField(SIZE_PRESETS[0].sizeMeters, onSelect);

    const target = SIZE_PRESETS[SIZE_PRESETS.length - 1];
    await user.click(screen.getByRole('radio', { name: target.label }));

    expect(onSelect).toHaveBeenCalledWith(target.sizeMeters);
  });
});

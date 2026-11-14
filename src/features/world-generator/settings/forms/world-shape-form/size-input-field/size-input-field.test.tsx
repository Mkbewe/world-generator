import { useState } from 'react';
import { Theme } from '@radix-ui/themes';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { SizeInputField } from './size-input-field';
import { MAX_WORLD_SIZE, MIN_WORLD_SIZE } from '../lib/world-shape';

function StatefulField({
  initial = '6000',
  onChange,
  onCommit,
}: {
  initial?: string;
  onChange?: (value: string) => void;
  onCommit?: () => void;
}) {
  const [value, setValue] = useState(initial);
  return (
    <Theme>
      <SizeInputField
        value={value}
        onChange={next => {
          setValue(next);
          onChange?.(next);
        }}
        onCommit={onCommit ?? (() => {})}
      />
    </Theme>
  );
}

describe('SizeInputField', () => {
  it('shows the current value with the supported limits', () => {
    render(<StatefulField />);

    const input = screen.getByLabelText('Custom size:');
    expect(input).toHaveValue(6000);
    expect(input).toHaveAttribute('min', String(MIN_WORLD_SIZE));
    expect(input).toHaveAttribute('max', String(MAX_WORLD_SIZE));
  });

  it('reports typed values', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<StatefulField onChange={onChange} />);

    const input = screen.getByLabelText('Custom size:');
    await user.clear(input);
    await user.type(input, '4500');

    expect(onChange).toHaveBeenLastCalledWith('4500');
  });

  it('commits when the field loses focus', async () => {
    const user = userEvent.setup();
    const onCommit = vi.fn();
    render(<StatefulField onCommit={onCommit} />);

    await user.click(screen.getByLabelText('Custom size:'));
    await user.tab();

    expect(onCommit).toHaveBeenCalledTimes(1);
  });
});

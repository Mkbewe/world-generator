import { Theme } from '@radix-ui/themes';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { GeneralForm } from './general-form';

function renderForm(seed = '123456') {
  const onSeedChange = vi.fn();
  render(
    <Theme>
      <GeneralForm seed={seed} onSeedChange={onSeedChange} />
    </Theme>
  );
  return { onSeedChange };
}

describe('GeneralForm', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows the current seed and reports edits', async () => {
    const user = userEvent.setup();
    const { onSeedChange } = renderForm();

    const input = screen.getByLabelText('Seed:');
    expect(input).toHaveValue('123456');

    await user.type(input, '7');

    expect(onSeedChange).toHaveBeenCalled();
    expect(onSeedChange.mock.calls.at(-1)?.[0]).toBe('1234567');
  });

  it('randomizes the seed to six digits', async () => {
    const user = userEvent.setup();
    const { onSeedChange } = renderForm();
    vi.spyOn(Math, 'random').mockReturnValue(0.000042);

    await user.click(screen.getByRole('button', { name: 'Randomize' }));

    expect(onSeedChange).toHaveBeenCalledWith('000042');
  });
});

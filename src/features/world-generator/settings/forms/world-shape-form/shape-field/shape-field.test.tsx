import { Theme } from '@radix-ui/themes';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ShapeField } from './shape-field';

function renderField(
  shape: 'disc' | 'rectangle',
  onShapeChange: (shape: 'disc' | 'rectangle') => void = () => {}
) {
  render(
    <Theme>
      <ShapeField shape={shape} onShapeChange={onShapeChange} />
    </Theme>
  );
}

describe('ShapeField', () => {
  it('marks only the active shape', () => {
    renderField('disc');

    expect(screen.getByRole('radio', { name: 'Disc' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: 'Rectangle' })).toHaveAttribute(
      'aria-checked',
      'false'
    );
  });

  it('reports the chosen shape', async () => {
    const user = userEvent.setup();
    const onShapeChange = vi.fn();
    renderField('disc', onShapeChange);

    await user.click(screen.getByRole('radio', { name: 'Rectangle' }));

    expect(onShapeChange).toHaveBeenCalledWith('rectangle');
  });
});

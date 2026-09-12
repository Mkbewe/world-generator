import { Theme } from '@radix-ui/themes';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { NoiseForm } from './noise-form';
import type { NoiseConfig } from '../../../utils/map-generator';

const noise: NoiseConfig = { frequency: 4, octaves: 4, persistence: 0.5, lacunarity: 2 };

function renderForm(onNoiseChange = vi.fn()) {
  render(
    <Theme>
      <NoiseForm noise={noise} onNoiseChange={onNoiseChange} />
    </Theme>
  );
  return onNoiseChange;
}

describe('NoiseForm', () => {
  it('renders every noise field with its value', () => {
    renderForm();

    expect(screen.getByText('Frequency')).toBeInTheDocument();
    expect(screen.getByText('4.0')).toBeInTheDocument();
    expect(screen.getByText('Octaves')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByText('Persistence')).toBeInTheDocument();
    expect(screen.getByText('0.50')).toBeInTheDocument();
    expect(screen.getByText('Lacunarity')).toBeInTheDocument();
    expect(screen.getByText('2.0')).toBeInTheDocument();
    expect(screen.getAllByRole('slider')).toHaveLength(4);
  });

  it('emits the updated config when a slider changes', async () => {
    const onNoiseChange = renderForm();
    const octaves = screen.getAllByRole('slider')[1];

    octaves.focus();
    await userEvent.keyboard('{ArrowRight}');

    expect(onNoiseChange).toHaveBeenCalledWith({ ...noise, octaves: 5 });
  });
});

import { Theme } from '@radix-ui/themes';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { SliderField } from './slider-field';

const baseProps = {
  label: 'Irregularity',
  description: 'How strongly region borders bend away from their shape.',
  value: 0.1,
  min: 0,
  max: 0.3,
  step: 0.01,
};

describe('SliderField', () => {
  it('renders the formatted value, range labels and the slider', () => {
    render(
      <Theme>
        <SliderField {...baseProps} rangeLabels={['None', 'Large']} onChange={() => {}} />
      </Theme>
    );

    expect(screen.getByText('0.10')).toBeInTheDocument();
    expect(screen.getByText('None')).toBeInTheDocument();
    expect(screen.getByText('Large')).toBeInTheDocument();
    expect(screen.getByRole('slider')).toBeInTheDocument();
  });

  it('uses a custom format and reports keyboard changes', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <Theme>
        <SliderField
          {...baseProps}
          format={value => `${Math.round(value * 100)}%`}
          onChange={onChange}
        />
      </Theme>
    );

    expect(screen.getByText('10%')).toBeInTheDocument();

    const slider = screen.getByRole('slider');
    slider.focus();
    await user.keyboard('{ArrowRight}');

    expect(onChange).toHaveBeenCalled();
    expect(onChange.mock.calls[0][0]).toBeCloseTo(0.11);
  });
});

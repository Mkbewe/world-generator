import { Theme } from '@radix-ui/themes';
import { render, screen } from '@testing-library/react';

import { StatLabel } from './stat-label';

describe('StatLabel', () => {
  it('renders the label text', () => {
    render(
      <Theme>
        <StatLabel label='Coverage' description='Share of the grid.' />
      </Theme>
    );

    expect(screen.getByText('Coverage')).toBeInTheDocument();
  });
});

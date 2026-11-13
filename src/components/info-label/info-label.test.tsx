import { Theme } from '@radix-ui/themes';
import { render, screen } from '@testing-library/react';

import { InfoLabel } from './info-label';

describe('InfoLabel', () => {
  it('renders the label text', () => {
    render(
      <Theme>
        <InfoLabel label='Coverage' description='Share of the grid.' />
      </Theme>
    );

    expect(screen.getByText('Coverage')).toBeInTheDocument();
  });

  it('renders without a description', () => {
    const { container } = render(
      <Theme>
        <InfoLabel label='Coverage' />
      </Theme>
    );

    expect(screen.getByText('Coverage')).toBeInTheDocument();
    expect(container.querySelector('svg')).toBeNull();
  });
});

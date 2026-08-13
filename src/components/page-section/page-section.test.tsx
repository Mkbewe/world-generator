import { render, screen } from '@testing-library/react';

import { PageSection } from './page-section';

describe('PageSection', () => {
  it('should render a section by default', () => {
    const { container } = render(<PageSection>Content</PageSection>);

    expect(container.querySelector('section')).toBeInTheDocument();
  });

  it('should render the selected semantic element and forward HTML attributes', () => {
    const { container } = render(
      <PageSection as='header' id='page-header' aria-label='Page header'>
        Content
      </PageSection>
    );

    const header = container.querySelector('header');
    expect(header).toHaveAttribute('id', 'page-header');
    expect(header).toHaveAttribute('aria-label', 'Page header');
  });

  it('should expose selected variants', () => {
    const { container } = render(
      <PageSection background='subtle' border='both' padding='large'>
        <span>Content</span>
      </PageSection>
    );

    const section = container.querySelector('section');
    expect(section).toHaveAttribute('data-background', 'subtle');
    expect(section).toHaveAttribute('data-border', 'both');
    expect(section).toHaveAttribute('data-padding', 'large');
    expect(screen.getByText('Content').parentElement).toHaveAttribute('class');
  });
});

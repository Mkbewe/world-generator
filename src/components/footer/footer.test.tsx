import { render, screen } from '@testing-library/react';

import { Footer } from './footer';

describe('Footer', () => {
  it('should render successfully', () => {
    const { container } = render(<Footer />);
    expect(container).toBeTruthy();
  });

  it('should display application name and version', () => {
    render(<Footer />);

    const titleElement = screen.getByText(/World Generator v0.0.5/i);
    expect(titleElement).toBeInTheDocument();
  });

  it('should display description', () => {
    render(<Footer />);

    const description = screen.getByText(/Create procedural island worlds/i);
    expect(description).toBeInTheDocument();
  });

  it('should display copyright with current year', () => {
    render(<Footer />);

    const currentYear = new Date().getFullYear();
    const copyright = screen.getByText(new RegExp(`© ${currentYear} World Generator`, 'i'));
    expect(copyright).toBeInTheDocument();
  });

  it('should render as footer element', () => {
    const { container } = render(<Footer />);

    const footer = container.querySelector('footer');
    expect(footer).toBeInTheDocument();
  });
});

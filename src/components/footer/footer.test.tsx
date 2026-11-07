import { render, screen } from '@testing-library/react';

import { Footer } from './footer';
import { appConfig } from '../../config';
import { i18n } from '../../i18n';

describe('Footer', () => {
  it('should render successfully', () => {
    const { container } = render(<Footer />);
    expect(container).toBeTruthy();
  });

  it('should expose a valid version from config', () => {
    expect(appConfig.version).toMatch(/^\d+\.\d+\.\d+/);
  });

  it('should display application name and version', () => {
    render(<Footer />);

    const titleElement = screen.getByText(
      new RegExp(`${i18n.t('app.name')} v${appConfig.version}`, 'i')
    );
    expect(titleElement).toBeInTheDocument();
  });

  it('should display description', () => {
    render(<Footer />);

    const description = screen.getByText(new RegExp(i18n.t('app.description'), 'i'));
    expect(description).toBeInTheDocument();
  });

  it('should display copyright with current year', () => {
    render(<Footer />);

    const currentYear = new Date().getFullYear();
    const copyright = screen.getByText(new RegExp(`© ${currentYear} ${i18n.t('app.name')}`, 'i'));
    expect(copyright).toBeInTheDocument();
  });

  it('should render as footer element', () => {
    const { container } = render(<Footer />);

    const footer = container.querySelector('footer');
    expect(footer).toBeInTheDocument();
  });
});

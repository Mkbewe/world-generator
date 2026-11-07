import { useTranslation } from 'react-i18next';
import { render, screen } from '@testing-library/react';

import { i18nReady } from './index';

function Probe() {
  const { t } = useTranslation();
  return <span>{t('app.name')}</span>;
}

describe('useTranslation', () => {
  beforeAll(async () => {
    await i18nReady;
  });

  it('renders with the default catalogue without a provider', () => {
    render(<Probe />);

    expect(screen.getByText('World Generator')).toBeInTheDocument();
  });
});

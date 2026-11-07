import { Theme } from '@radix-ui/themes';
import { act, render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';

import { LanguageSwitcher } from './language-switcher';
import {
  DEFAULT_LOCALE,
  i18n,
  type Locale,
  LOCALE_OPTIONS,
  SUPPORTED_LOCALES,
} from '../../../i18n';
import { readStoredLocale } from '../../../i18n/locale-storage';

function renderSwitcher(variant?: 'button' | 'row') {
  return render(
    <Theme>
      <LanguageSwitcher variant={variant} />
    </Theme>
  );
}

function localeLabel(locale: Locale): string {
  return LOCALE_OPTIONS[locale].label;
}

function triggerName(): string {
  return `${i18n.t('header.language')}: ${localeLabel(DEFAULT_LOCALE)}`;
}

const otherLocales = SUPPORTED_LOCALES.filter(locale => locale !== DEFAULT_LOCALE);

describe('LanguageSwitcher', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await act(() => i18n.changeLanguage(DEFAULT_LOCALE));
  });

  it('renders a labelled trigger with the current flag and name', () => {
    renderSwitcher();

    const trigger = screen.getByRole('button', { name: triggerName() });
    expect(trigger).toBeInTheDocument();
    expect(trigger.querySelector('img')).toHaveAttribute(
      'src',
      LOCALE_OPTIONS[DEFAULT_LOCALE].flagUrl
    );
  });

  it('expands the drawer row into an inline list of every supported locale', async () => {
    const user = userEvent.setup();
    renderSwitcher('row');

    const trigger = screen.getByRole('button', { name: triggerName() });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');

    await user.click(trigger);

    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    for (const locale of SUPPORTED_LOCALES) {
      const option = screen.getByRole('radio', { name: localeLabel(locale) });
      expect(option).toHaveAttribute('aria-checked', locale === DEFAULT_LOCALE ? 'true' : 'false');
      expect(option.closest('label')?.querySelector('img')).toHaveAttribute(
        'src',
        LOCALE_OPTIONS[locale].flagUrl
      );
    }

    await user.click(screen.getByRole('radio', { name: localeLabel(DEFAULT_LOCALE) }));

    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('opens a menu with the flag and name of every supported locale', async () => {
    const user = userEvent.setup();
    renderSwitcher();

    await user.click(screen.getByRole('button', { name: triggerName() }));

    for (const locale of SUPPORTED_LOCALES) {
      const item = await screen.findByRole('menuitem', { name: localeLabel(locale) });
      expect(item.querySelector('img')).toHaveAttribute('src', LOCALE_OPTIONS[locale].flagUrl);
    }
  });

  it.each(otherLocales)('switches to %s and persists the choice', async locale => {
    const changeLanguage = vi.spyOn(i18n, 'changeLanguage');
    const user = userEvent.setup();
    renderSwitcher();

    await user.click(screen.getByRole('button', { name: triggerName() }));
    await user.click(await screen.findByRole('menuitem', { name: localeLabel(locale) }));

    expect(changeLanguage).toHaveBeenCalledWith(locale);
    expect(readStoredLocale()).toBe(locale);
  });
});

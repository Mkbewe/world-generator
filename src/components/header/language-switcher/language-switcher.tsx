import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDownIcon } from '@radix-ui/react-icons';
import { Box, Button, DropdownMenu, Flex, RadioGroup, Text } from '@radix-ui/themes';

import { useLocale } from '../../../hooks/use-locale';
import { LOCALE_OPTIONS, resolveLocale, SUPPORTED_LOCALES } from '../../../i18n';
import styles from './language-switcher.module.scss';

interface LanguageSwitcherProps {
  variant?: 'button' | 'row';
}

export function LanguageSwitcher({ variant = 'button' }: LanguageSwitcherProps) {
  const { t } = useTranslation();
  const { locale, setLocale } = useLocale();
  const [isOpen, setIsOpen] = useState(false);
  const optionsId = useId();
  const currentLabel = LOCALE_OPTIONS[locale].label;
  const accessibleName = `${t('header.language')}: ${currentLabel}`;
  const currentFlag = (
    <img
      src={LOCALE_OPTIONS[locale].flagUrl}
      alt=''
      width={20}
      height={20}
      className={styles.flag}
    />
  );

  if (variant === 'row') {
    return (
      <Box>
        <Button
          variant='ghost'
          color='gray'
          className={styles.setting}
          title={t('header.language')}
          aria-label={accessibleName}
          aria-expanded={isOpen}
          aria-controls={optionsId}
          onClick={() => setIsOpen(open => !open)}
        >
          <Text as='span'>{t('header.language')}</Text>
          <Flex align='center' gap='2' className={styles.value}>
            {currentFlag}
            <Text as='span'>{currentLabel}</Text>
            <ChevronDownIcon
              className={isOpen ? `${styles.chevron} ${styles.chevronOpen}` : styles.chevron}
              aria-hidden='true'
            />
          </Flex>
        </Button>
        {isOpen && (
          <RadioGroup.Root
            id={optionsId}
            value={locale}
            onValueChange={value => {
              setLocale(resolveLocale(value));
              setIsOpen(false);
            }}
            aria-label={t('header.language')}
            className={styles.inlineOptions}
          >
            {SUPPORTED_LOCALES.map(option => (
              <RadioGroup.Item
                key={option}
                value={option}
                className={
                  option === locale
                    ? `${styles.inlineOption} ${styles.inlineOptionActive}`
                    : styles.inlineOption
                }
                onClick={() => setIsOpen(false)}
              >
                <Flex align='center' gap='2'>
                  <img
                    src={LOCALE_OPTIONS[option].flagUrl}
                    alt=''
                    width={20}
                    height={20}
                    className={styles.flag}
                  />
                  <Text as='span'>{LOCALE_OPTIONS[option].label}</Text>
                  {option === locale && (
                    <Text as='span' className={styles.inlineCheck} aria-hidden='true'>
                      ✓
                    </Text>
                  )}
                </Flex>
              </RadioGroup.Item>
            ))}
          </RadioGroup.Root>
        )}
      </Box>
    );
  }

  return (
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger>
        <Button
          size='3'
          variant='surface'
          color='gray'
          title={t('header.language')}
          aria-label={accessibleName}
        >
          {currentFlag}
          <Text as='span'>{currentLabel}</Text>
          <ChevronDownIcon aria-hidden='true' />
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content align='end' color='gray' className={styles.menu}>
        {SUPPORTED_LOCALES.map(option => (
          <DropdownMenu.Item
            key={option}
            onSelect={() => setLocale(option)}
            className={
              option === locale ? `${styles.menuItem} ${styles.menuItemActive}` : styles.menuItem
            }
          >
            <Flex align='center' justify='between' gap='2' className={styles.menuItemContent}>
              <Flex align='center' gap='2'>
                <img
                  src={LOCALE_OPTIONS[option].flagUrl}
                  alt=''
                  width={20}
                  height={20}
                  className={styles.flag}
                />
                <Text as='span'>{LOCALE_OPTIONS[option].label}</Text>
              </Flex>
              {option === locale && (
                <Text as='span' className={styles.inlineCheck} aria-hidden='true'>
                  ✓
                </Text>
              )}
            </Flex>
          </DropdownMenu.Item>
        ))}
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  );
}

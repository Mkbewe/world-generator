import { useTranslation } from 'react-i18next';
import { NavLink, useLocation } from 'react-router';
import * as NavigationMenu from '@radix-ui/react-navigation-menu';

import type { MessageKey } from '../../i18n';
import { PageSection } from '../page-section';
import styles from './navigation.module.scss';

export interface NavigationItem {
  labelKey: MessageKey;
  to: string;
}

export const NAVIGATION_ITEMS: readonly NavigationItem[] = [
  { labelKey: 'navigation.home', to: '/' },
  { labelKey: 'navigation.statistics', to: '/statistics' },
  { labelKey: 'navigation.legacy', to: '/legacy-generator' },
];

export function isActivePath(pathname: string, to: string): boolean {
  if (to === '/') {
    return pathname === '/';
  }

  return pathname === to || pathname.startsWith(`${to}/`);
}

export interface NavigationProps {
  /** Removes the bar from the tab order while the fullscreen overlay is open. */
  inert?: boolean;
}

export function Navigation({ inert = false }: NavigationProps) {
  const { pathname } = useLocation();
  const { t } = useTranslation();

  return (
    <div className={styles.navBar} inert={inert || undefined}>
      <PageSection as='section' background='subtle' border='bottom' p='none'>
        <NavigationMenu.Root>
          <NavigationMenu.List className={styles.list}>
            {NAVIGATION_ITEMS.map(item => (
              <NavigationMenu.Item key={item.to}>
                <NavigationMenu.Link asChild>
                  <NavLink
                    to={item.to}
                    className={
                      isActivePath(pathname, item.to)
                        ? `${styles.link} ${styles.active}`
                        : styles.link
                    }
                  >
                    {t(item.labelKey)}
                  </NavLink>
                </NavigationMenu.Link>
              </NavigationMenu.Item>
            ))}
          </NavigationMenu.List>
        </NavigationMenu.Root>
      </PageSection>
    </div>
  );
}

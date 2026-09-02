import { NavLink, useLocation } from 'react-router';
import * as NavigationMenu from '@radix-ui/react-navigation-menu';

import { PageSection } from '../page-section';
import styles from './navigation.module.scss';

export interface NavigationItem {
  label: string;
  to: string;
}

export const NAVIGATION_ITEMS: readonly NavigationItem[] = [
  { label: 'Home', to: '/' },
  { label: 'Statistics', to: '/statistics' },
  { label: 'Legacy Generator', to: '/legacy-generator' },
];

export function isActivePath(pathname: string, to: string): boolean {
  if (to === '/') {
    return pathname === '/';
  }

  return pathname === to || pathname.startsWith(`${to}/`);
}

export function Navigation() {
  const { pathname } = useLocation();

  return (
    <div className={styles.navBar}>
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
                    {item.label}
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

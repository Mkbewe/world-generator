import type { ReactNode } from 'react';
import { type UIMatch, useMatches } from 'react-router';

import { BreadcrumbItem } from './breadcrumb-item';
import styles from './breadcrumbs.module.scss';

export interface BreadcrumbsItem {
  label: string;
  to?: string;
}

export interface RouteHandle {
  breadcrumb?: string;
}

interface BreadcrumbsProps {
  items?: BreadcrumbsItem[];
}

function getBreadcrumb(handle: unknown): string | undefined {
  if (
    typeof handle === 'object' &&
    handle !== null &&
    'breadcrumb' in handle &&
    typeof handle.breadcrumb === 'string' &&
    handle.breadcrumb.length > 0
  ) {
    return handle.breadcrumb;
  }
}

function getBreadcrumbsFromMatches(matches: UIMatch[]): BreadcrumbsItem[] {
  const crumbs: BreadcrumbsItem[] = [];

  for (const match of matches) {
    const breadcrumb = getBreadcrumb(match.handle);

    if (breadcrumb) {
      crumbs.push({
        label: breadcrumb,
        to: match.pathname,
      });
    }
  }

  return crumbs;
}

function renderBreadcrumbs(breadcrumbs: BreadcrumbsItem[]) {
  if (breadcrumbs.length === 0) {
    return null;
  }

  const itemsList: ReactNode[] = breadcrumbs.map((crumb, index) => (
    <BreadcrumbItem
      key={crumb.to ?? crumb.label}
      label={crumb.label}
      to={crumb.to}
      isLast={index === breadcrumbs.length - 1}
    />
  ));

  return (
    <nav aria-label='Breadcrumb' className={styles.nav}>
      <ol className={styles.list}>{itemsList}</ol>
    </nav>
  );
}

function BreadcrumbsFromRouter() {
  const breadcrumbs = getBreadcrumbsFromMatches(useMatches());

  return renderBreadcrumbs(breadcrumbs);
}

export function Breadcrumbs({ items }: BreadcrumbsProps) {
  if (items) {
    return renderBreadcrumbs(items);
  }

  return <BreadcrumbsFromRouter />;
}

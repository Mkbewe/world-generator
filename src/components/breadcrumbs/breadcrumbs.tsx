import type { ReactNode } from 'react';
import { type UIMatch, useMatches } from 'react-router';

import { BreadcrumbItem } from './breadcrumb-item';
import styles from './breadcrumbs.module.scss';

export interface BreadcrumbsItem {
  label: string;
  to?: string;
}

interface BreadcrumbsProps {
  items?: BreadcrumbsItem[];
}

type MatchWithBreadcrumb = UIMatch<unknown, { breadcrumb?: string }>;

function getBreadcrumbsFromMatches(matches: MatchWithBreadcrumb[]): BreadcrumbsItem[] {
  const crumbs: BreadcrumbsItem[] = [];

  for (const match of matches) {
    if (match.handle?.breadcrumb) {
      crumbs.push({
        label: match.handle.breadcrumb,
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
  const matches = useMatches() as MatchWithBreadcrumb[];
  const breadcrumbs = getBreadcrumbsFromMatches(matches);

  return renderBreadcrumbs(breadcrumbs);
}

export function Breadcrumbs({ items }: BreadcrumbsProps) {
  if (items) {
    return renderBreadcrumbs(items);
  }

  return <BreadcrumbsFromRouter />;
}

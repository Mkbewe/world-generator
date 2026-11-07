import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { type UIMatch, useMatches } from 'react-router';

import { BreadcrumbItem } from './breadcrumb-item';
import { isMessageKey, type MessageKey } from '../../i18n';
import styles from './breadcrumbs.module.scss';

export interface BreadcrumbsItem {
  labelKey: MessageKey;
  to?: string;
}

export interface RouteHandle {
  breadcrumbKey?: MessageKey;
}

interface BreadcrumbsProps {
  items?: BreadcrumbsItem[];
}

function getBreadcrumbKey(handle: unknown): MessageKey | undefined {
  if (
    typeof handle === 'object' &&
    handle !== null &&
    'breadcrumbKey' in handle &&
    typeof handle.breadcrumbKey === 'string' &&
    isMessageKey(handle.breadcrumbKey)
  ) {
    return handle.breadcrumbKey;
  }
}

function getBreadcrumbsFromMatches(matches: UIMatch[]): BreadcrumbsItem[] {
  const crumbs: BreadcrumbsItem[] = [];

  for (const match of matches) {
    const breadcrumbKey = getBreadcrumbKey(match.handle);

    if (breadcrumbKey) {
      crumbs.push({
        labelKey: breadcrumbKey,
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

  return <BreadcrumbNav breadcrumbs={breadcrumbs} />;
}

function BreadcrumbNav({ breadcrumbs }: { breadcrumbs: BreadcrumbsItem[] }) {
  const { t } = useTranslation();
  const itemsList: ReactNode[] = breadcrumbs.map((crumb, index) => (
    <BreadcrumbItem
      key={crumb.to ?? crumb.labelKey}
      label={t(crumb.labelKey)}
      to={crumb.to}
      isLast={index === breadcrumbs.length - 1}
    />
  ));

  return (
    <nav aria-label={t('breadcrumbs.label')} className={styles.nav}>
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

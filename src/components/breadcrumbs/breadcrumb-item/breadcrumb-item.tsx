import { Link } from 'react-router';
import { ChevronRightIcon } from '@radix-ui/react-icons';

import styles from './breadcrumb-item.module.scss';

export interface BreadcrumbItemProps {
  label: string;
  to?: string;
  isLast?: boolean;
}

export function BreadcrumbItem({ label, to, isLast = false }: BreadcrumbItemProps) {
  return (
    <li className={styles.item}>
      {to && !isLast ? (
        <Link to={to} className={styles.link}>
          {label}
        </Link>
      ) : (
        <span className={styles.active} aria-current={isLast ? 'page' : undefined}>
          {label}
        </span>
      )}
      {!isLast && <ChevronRightIcon className={styles.separator} />}
    </li>
  );
}

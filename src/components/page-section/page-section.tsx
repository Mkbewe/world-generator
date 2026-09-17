import type { ElementType, HTMLAttributes, ReactNode } from 'react';

import styles from './page-section.module.scss';

type PageSectionElement = 'div' | 'section' | 'header' | 'main' | 'footer';
type PageSectionBackground = 'default' | 'subtle' | 'transparent';
type PageSectionBorder = 'none' | 'top' | 'bottom' | 'both';
type PaddingSize = 'none' | 'compact' | 'small' | 'medium' | 'large';

export interface PageSectionProps extends Omit<
  HTMLAttributes<HTMLElement>,
  'children' | 'className'
> {
  as?: PageSectionElement;
  background?: PageSectionBackground;
  border?: PageSectionBorder;
  p?: PaddingSize;
  pt?: PaddingSize;
  pb?: PaddingSize;
  /** Horizontal padding preset; `compact` halves the default inline padding. */
  px?: 'default' | 'compact';
  /** Drops the max content width; the section spans the whole viewport. */
  fluid?: boolean;
  children: ReactNode;
}

export function PageSection({
  as = 'section',
  background = 'transparent',
  border = 'none',
  p = 'none',
  pt,
  pb,
  px = 'default',
  fluid = false,
  children,
  ...htmlProps
}: PageSectionProps) {
  const Element: ElementType = as;

  return (
    <Element
      {...htmlProps}
      className={styles.root}
      data-background={background}
      data-border={border}
      data-pt={pt ?? p}
      data-pb={pb ?? p}
      data-px={px}
      data-fluid={fluid || undefined}
    >
      <div className={styles.content}>{children}</div>
    </Element>
  );
}

import type { ElementType, HTMLAttributes, ReactNode } from 'react';

import styles from './page-section.module.scss';

type PageSectionElement = 'div' | 'section' | 'header' | 'main' | 'footer';
type PageSectionBackground = 'default' | 'subtle' | 'transparent';
type PageSectionBorder = 'none' | 'top' | 'bottom' | 'both';
type PaddingSize = 'none' | 'small' | 'medium' | 'large';

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
  children: ReactNode;
}

export function PageSection({
  as = 'section',
  background = 'transparent',
  border = 'none',
  p = 'none',
  pt,
  pb,
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
    >
      <div className={styles.content}>{children}</div>
    </Element>
  );
}

import type { ElementType, HTMLAttributes, ReactNode } from 'react';

import styles from './page-section.module.scss';

type PageSectionElement = 'div' | 'section' | 'header' | 'main' | 'footer';
type PageSectionBackground = 'default' | 'subtle' | 'transparent';
type PageSectionBorder = 'none' | 'top' | 'bottom' | 'both';
type PageSectionPadding = 'none' | 'small' | 'medium' | 'large';

export interface PageSectionProps extends Omit<
  HTMLAttributes<HTMLElement>,
  'children' | 'className'
> {
  as?: PageSectionElement;
  background?: PageSectionBackground;
  border?: PageSectionBorder;
  padding?: PageSectionPadding;
  children: ReactNode;
}

export function PageSection({
  as = 'section',
  background = 'transparent',
  border = 'none',
  padding = 'none',
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
      data-padding={padding}
    >
      <div className={styles.content}>{children}</div>
    </Element>
  );
}

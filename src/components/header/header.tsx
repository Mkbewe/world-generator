import styles from './header.module.css';

interface HeaderProps {
  onExportMap?: () => void;
}

export function Header({ onExportMap }: HeaderProps) {
  return (
    <header className={styles.header}>
      <div className={styles.headerContent}>
        <div className={styles.logo}>
          <img src='/favicon.svg' alt='World Generator Logo' className={styles.logoImage} />
          <h1 className={styles.title}>World Generator</h1>
        </div>

        <nav className={styles.nav}>
          {onExportMap && (
            <button onClick={onExportMap} className={styles.exportButton} title='Export map as PNG'>
              <svg
                className={styles.icon}
                width='20'
                height='20'
                viewBox='0 0 24 24'
                fill='none'
                stroke='currentColor'
                strokeWidth='2'
              >
                <path d='M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4' />
                <polyline points='7 10 12 15 17 10' />
                <line x1='12' y1='15' x2='12' y2='3' />
              </svg>
              Export PNG
            </button>
          )}
        </nav>
      </div>
    </header>
  );
}

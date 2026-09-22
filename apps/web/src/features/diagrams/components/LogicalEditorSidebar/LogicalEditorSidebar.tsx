import { useMemo, useState } from 'react';
import styles from '../EditorSidebar/EditorSidebar.module.css';
import logicalStyles from './LogicalEditorSidebar.module.css';

function TablePreview() {
  return (
    <svg className={styles.elementPreview} viewBox='0 0 24 18' aria-hidden='true'>
      <rect x='2' y='2' width='20' height='14' className={logicalStyles.logicalPreviewShape} />
      <path d='M2 6h20M8 6v10M15 6v10' className={logicalStyles.logicalPreviewDivider} />
    </svg>
  );
}

export function LogicalEditorSidebar() {
  const [search, setSearch] = useState('');
  const items = useMemo(
    () =>
      [{ kind: 'logical-table', label: 'Tabela' }].filter((item) =>
        item.label.toLowerCase().includes(search.toLowerCase()),
      ),
    [search],
  );

  return (
    <aside className={styles.sidebar}>
      <div className={styles.sidebarHeader}>
        <div className={styles.sectionHeading}>
          <span>Biblioteca</span>
        </div>

        <label className={styles.search}>
          <span aria-hidden='true'>⌕</span>
          <input
            type='search'
            placeholder='Buscar elemento'
            aria-label='Buscar elemento'
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
      </div>

      <div className={styles.libraryContent}>
        <section className={styles.category}>
          <div className={styles.elementList}>
            {items.map((item) => (
              <button
                className={styles.elementItem}
                key={item.kind}
                type='button'
                draggable
                onDragStart={(event) => {
                  event.dataTransfer.effectAllowed = 'copy';
                  event.dataTransfer.setData('application/logical-element', item.kind);
                }}
              >
                <TablePreview />
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </section>
      </div>

      <div className={styles.sidebarFooter}>Arraste uma tabela para o canvas para utilizá-la no modelo.</div>
    </aside>
  );
}

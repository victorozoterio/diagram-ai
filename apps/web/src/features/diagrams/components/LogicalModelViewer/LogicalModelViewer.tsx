import type { LogicalModel } from '../../types';
import styles from './LogicalModelViewer.module.css';

type LogicalModelViewerProps = {
  model: LogicalModel;
};

export function LogicalModelViewer({ model }: LogicalModelViewerProps) {
  return (
    <div className={styles.cardsGrid}>
      {model.tables.map((table) => (
        <article key={table.id} className={styles.tableCard}>
          <h4>{table.name}</h4>

          <ul>
            {table.columns.map((column) => (
              <li key={column.id}>
                {column.primaryKey && <strong className={styles.keyBadge}>PK</strong>}
                {column.foreignKey && <strong className={styles.keyBadge}>FK</strong>}

                <span>{column.name}</span>

                <small className={styles.badge}>{column.type}</small>

                {column.required && <em className={styles.muted}>NOT NULL</em>}
                {column.unique && <em className={styles.muted}>UNIQUE</em>}

                {column.references && (
                  <em className={styles.muted}>
                    → {column.references.tableId}.{column.references.columnId}
                  </em>
                )}
              </li>
            ))}
          </ul>
        </article>
      ))}
    </div>
  );
}

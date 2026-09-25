import type { ReactNode } from 'react';
import type { SqlDialect } from '@/api/diagrams.api';
import styles from './SqlGeneratorModal.module.css';

type SqlGeneratorModalProps = {
  dialect: SqlDialect;
  sql: string;
  isLoading: boolean;
  error: string | null;
  message: string;
  onDialectChange: (dialect: SqlDialect) => void;
  onCopy: () => void;
  onDownload: () => void;
  onClose: () => void;
};

const DIALECT_LABELS: Record<SqlDialect, string> = {
  postgresql: 'PostgreSQL',
  mysql: 'MySQL',
  mariadb: 'MariaDB',
  sqlserver: 'Microsoft SQL Server',
};

const SQL_KEYWORDS = new Set([
  'ADD',
  'ALTER',
  'CONSTRAINT',
  'CREATE',
  'FOREIGN',
  'KEY',
  'NOT',
  'NULL',
  'PRIMARY',
  'REFERENCES',
  'TABLE',
  'UNIQUE',
]);

const SQL_TYPES = new Set([
  'BIGINT',
  'BIT',
  'BOOLEAN',
  'CHAR',
  'DATE',
  'DATETIME',
  'DATETIME2',
  'DECIMAL',
  'INT',
  'INTEGER',
  'NVARCHAR',
  'TEXT',
  'TIMESTAMP',
  'UNIQUEIDENTIFIER',
  'UUID',
  'VARCHAR',
]);

export function SqlGeneratorModal({
  dialect,
  sql,
  isLoading,
  error,
  message,
  onDialectChange,
  onCopy,
  onDownload,
  onClose,
}: SqlGeneratorModalProps) {
  return (
    <div className={styles.overlay}>
      <section
        className={styles.modal}
        role='dialog'
        aria-modal='true'
        aria-labelledby='sql-generator-title'
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className={styles.header}>
          <div>
            <span className={styles.eyebrow}>MODELO LÓGICO</span>
            <h2 id='sql-generator-title'>Gerar SQL</h2>
          </div>
          <button className={styles.closeButton} type='button' aria-label='Fechar' onClick={onClose}>
            ×
          </button>
        </div>

        <div className={styles.toolbar}>
          <label className={styles.dialectField}>
            <span>Banco de dados</span>
            <select value={dialect} onChange={(event) => onDialectChange(event.target.value as SqlDialect)}>
              {(Object.keys(DIALECT_LABELS) as SqlDialect[]).map((option) => (
                <option key={option} value={option}>
                  {DIALECT_LABELS[option]}
                </option>
              ))}
            </select>
          </label>
          <div className={styles.actions}>
            {message ? (
              <span className={styles.actionMessage} aria-live='polite'>
                {message}
              </span>
            ) : null}
            <button type='button' onClick={onCopy} disabled={isLoading || !sql}>
              Copiar SQL
            </button>
            <button type='button' onClick={onDownload} disabled={isLoading || !sql}>
              Baixar .sql
            </button>
          </div>
        </div>

        {error ? <p className={styles.error}>{error}</p> : null}
        <div className={styles.codePanel} aria-busy={isLoading}>
          {isLoading ? <span className={styles.status}>Gerando SQL...</span> : <pre>{highlightSql(sql)}</pre>}
        </div>
      </section>
    </div>
  );
}

function highlightSql(sql: string): ReactNode[] {
  if (!sql)
    return [
      <span key='empty' className={styles.status}>
        Nenhum SQL gerado.
      </span>,
    ];

  const tokenPattern = /(--[^\n]*|'(?:''|[^'])*'|\b\d+(?:\.\d+)?\b|\b[A-Za-z_][A-Za-z0-9_]*\b)/g;
  const parts: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while (true) {
    match = tokenPattern.exec(sql);
    if (!match) break;

    if (match.index > lastIndex) parts.push(sql.slice(lastIndex, match.index));
    const token = match[0];
    const upperToken = token.toUpperCase();
    const className = token.startsWith('--')
      ? styles.comment
      : token.startsWith("'")
        ? styles.string
        : /^\d/.test(token)
          ? styles.number
          : SQL_KEYWORDS.has(upperToken)
            ? styles.keyword
            : SQL_TYPES.has(upperToken)
              ? styles.type
              : undefined;

    parts.push(
      className ? (
        <span key={`${match.index}-${token}`} className={className}>
          {token}
        </span>
      ) : (
        token
      ),
    );
    lastIndex = tokenPattern.lastIndex;
  }

  if (lastIndex < sql.length) parts.push(sql.slice(lastIndex));
  return parts;
}

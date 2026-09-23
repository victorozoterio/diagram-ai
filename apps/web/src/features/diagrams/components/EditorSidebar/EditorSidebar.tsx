import { useMemo, useState } from 'react';
import type { ElementKind } from '../../types';
import styles from './EditorSidebar.module.css';

function ElementPreview({ kind }: { kind: ElementKind }) {
  const isEntity = kind === 'entity' || kind === 'weak-entity' || kind === 'associative-entity';
  const isAttribute = kind.includes('attribute');
  const isRelationship = kind === 'relationship';
  const isSpecialization = kind === 'generalization-specialization';

  return (
    <svg className={`${styles.elementPreview} ${styles[`preview-${kind}`]}`} viewBox='0 0 24 18' aria-hidden='true'>
      {isEntity && (
        <>
          <rect x='2' y='3' width='20' height='12' className={styles.previewShape} />
          {kind === 'weak-entity' && <rect x='4' y='5' width='16' height='8' className={styles.previewShape} />}
          {kind === 'associative-entity' && <polygon points='12,4 20,9 12,14 4,9' className={styles.previewShape} />}
        </>
      )}
      {isAttribute && (
        <>
          <ellipse cx='12' cy='9' rx='10' ry='6' className={styles.previewShape} />
          {kind === 'multivalued-attribute' && (
            <ellipse cx='12' cy='9' rx='8' ry='4.5' className={styles.previewShape} />
          )}
        </>
      )}
      {isRelationship && <polygon points='12,1 23,9 12,17 1,9' className={styles.previewShape} />}
      {isSpecialization && <polygon points='12,1 23,17 1,17' className={styles.previewShape} />}
    </svg>
  );
}

export function EditorSidebar() {
  const [search, setSearch] = useState('');
  const libraryItems: Array<{ kind: ElementKind; label: string }> = [
    { kind: 'entity', label: 'Entidade' },
    { kind: 'weak-entity', label: 'Entidade fraca' },
    { kind: 'associative-entity', label: 'Entidade associativa' },
    { kind: 'simple-attribute', label: 'Atributo simples' },
    { kind: 'multivalued-attribute', label: 'Atributo multivalorado' },
    { kind: 'composite-attribute', label: 'Atributo composto' },
    { kind: 'derived-attribute', label: 'Atributo derivado' },
    { kind: 'identifier-attribute', label: 'Atributo identificador' },
    { kind: 'relationship', label: 'Relacionamento' },
    { kind: 'generalization-specialization', label: 'Generalização / Especialização' },
  ];
  const filterItems = useMemo(
    () => (items: Array<{ kind: ElementKind; label: string }>) =>
      items.filter((item) => item.label.toLocaleLowerCase().includes(search.toLocaleLowerCase())),
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
        <div className={styles.elementList}>
          {filterItems(libraryItems).map((item) => (
            <button
              className={styles.elementItem}
              key={item.kind}
              type='button'
              draggable
              onDragStart={(event) => {
                event.dataTransfer.effectAllowed = 'copy';
                event.dataTransfer.setData('application/diagram-element', item.kind);
              }}
            >
              <ElementPreview kind={item.kind} />
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className={styles.sidebarFooter}>Arraste um elemento para o canvas para utilizá-lo no modelo.</div>
    </aside>
  );
}

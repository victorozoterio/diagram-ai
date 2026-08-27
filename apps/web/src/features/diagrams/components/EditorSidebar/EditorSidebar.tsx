import { useMemo, useState } from 'react';
import type { ConceptualModel, ElementKind } from '../../types';
import styles from './EditorSidebar.module.css';

type EditorSidebarProps = {
  model: ConceptualModel | null;
  onAddEntity: () => void;
};

type ElementCategoryProps = {
  icon: string;
  title: string;
  items: Array<{ kind: ElementKind; label: string }>;
};

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
          {(kind === 'weak-entity' || kind === 'associative-entity') && (
            <rect x='4' y='5' width='16' height='8' className={styles.previewShape} />
          )}
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

function ElementCategory({ icon, title, items }: ElementCategoryProps) {
  return (
    <section className={styles.category}>
      <h3>
        <span>{icon}</span>
        {title}
      </h3>
      <div className={styles.elementList}>
        {items.map((item) => (
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
            <span className={styles.elementGrip} aria-hidden='true'>
              ⋮⋮
            </span>
            <ElementPreview kind={item.kind} />
            <span>{item.label}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

export function EditorSidebar({ model, onAddEntity }: EditorSidebarProps) {
  const [search, setSearch] = useState('');
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
          <span className={styles.libraryBadge}>4</span>
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
        <ElementCategory
          icon='▦'
          title='Entidades'
          items={filterItems([
            { kind: 'entity', label: 'Entidade' },
            { kind: 'weak-entity', label: 'Entidade fraca' },
            { kind: 'associative-entity', label: 'Entidade associativa' },
          ])}
        />
        <ElementCategory
          icon='◈'
          title='Atributos'
          items={filterItems([
            { kind: 'simple-attribute', label: 'Atributo simples' },
            { kind: 'multivalued-attribute', label: 'Atributo multivalorado' },
            { kind: 'composite-attribute', label: 'Atributo composto' },
            { kind: 'derived-attribute', label: 'Atributo derivado' },
            { kind: 'identifier-attribute', label: 'Atributo identificador' },
          ])}
        />
        <ElementCategory
          icon='◇'
          title='Relacionamentos'
          items={filterItems([{ kind: 'relationship', label: 'Relacionamento' }])}
        />
        <ElementCategory
          icon='⑂'
          title='Generalização / Especialização'
          items={filterItems([{ kind: 'generalization-specialization', label: 'Generalização / Especialização' }])}
        />

        <section className={styles.category}>
          <div className={styles.categoryTitleRow}>
            <h3>
              <span>☷</span>
              Elementos no modelo
            </h3>
            <button type='button' onClick={onAddEntity} aria-label='Adicionar entidade'>
              +
            </button>
          </div>
          {model && model.entities.length > 0 ? (
            <ul className={styles.entityList}>
              {model.entities.map((entity) => (
                <li key={entity.id}>
                  <span className={styles.entityIcon}>▦</span>
                  <span>{entity.name}</span>
                  <small>{entity.attributes.length}</small>
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.emptyState}>Nenhum elemento adicionado.</p>
          )}
        </section>
      </div>

      <div className={styles.sidebarFooter}>Arraste um elemento para o canvas para utilizá-lo no modelo.</div>
    </aside>
  );
}

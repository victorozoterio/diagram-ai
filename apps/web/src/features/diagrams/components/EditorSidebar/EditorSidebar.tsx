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
            <span>{item.label}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

export function EditorSidebar({ model, onAddEntity }: EditorSidebarProps) {
  return (
    <aside className={styles.sidebar}>
      <div className={styles.sidebarHeader}>
        <div className={styles.sectionHeading}>
          <span>Biblioteca</span>
          <span className={styles.libraryBadge}>5</span>
        </div>

        <label className={styles.search}>
          <span aria-hidden='true'>⌕</span>
          <input type='search' placeholder='Buscar elemento' aria-label='Buscar elemento' />
        </label>
      </div>

      <div className={styles.libraryContent}>
        <ElementCategory
          icon='▦'
          title='Entidades'
          items={[
            { kind: 'entity', label: 'Entidade' },
            { kind: 'weak-entity', label: 'Entidade fraca' },
            { kind: 'associative-entity', label: 'Entidade associativa' },
          ]}
        />
        <ElementCategory
          icon='◈'
          title='Atributos'
          items={[
            { kind: 'simple-attribute', label: 'Atributo simples' },
            { kind: 'multivalued-attribute', label: 'Atributo multivalorado' },
            { kind: 'composite-attribute', label: 'Atributo composto' },
            { kind: 'derived-attribute', label: 'Atributo derivado' },
            { kind: 'identifier-attribute', label: 'Atributo identificador' },
          ]}
        />
        <ElementCategory icon='◇' title='Relacionamentos' items={[{ kind: 'relationship', label: 'Relacionamento' }]} />
        <ElementCategory
          icon='↔'
          title='Cardinalidades'
          items={[
            { kind: 'one-to-one', label: '1:1' },
            { kind: 'one-to-many', label: '1:N' },
            { kind: 'many-to-many', label: 'N:N' },
          ]}
        />
        <ElementCategory
          icon='⑂'
          title='Generalização / Especialização'
          items={[
            { kind: 'generalization', label: 'Generalização' },
            { kind: 'specialization', label: 'Especialização' },
          ]}
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

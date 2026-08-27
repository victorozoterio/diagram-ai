import type { ConceptualModel } from '../../types';
import styles from './EditorSidebar.module.css';

type EditorSidebarProps = {
  model: ConceptualModel | null;
  onAddEntity: () => void;
};

export function EditorSidebar({ model, onAddEntity }: EditorSidebarProps) {
  return (
    <aside className={styles.sidebar}>
      <div className={styles.sectionHeading}>
        <span>Estrutura</span>
        <button type='button' onClick={onAddEntity} aria-label='Adicionar entidade'>
          +
        </button>
      </div>

      <div className={styles.modeLabel}>MODELO CONCEITUAL</div>

      {model ? (
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
        <p className={styles.emptyState}>Gere ou descreva um modelo para visualizar sua estrutura.</p>
      )}

      <div className={styles.sidebarFooter}>Arraste elementos no canvas para organizar o modelo.</div>
    </aside>
  );
}

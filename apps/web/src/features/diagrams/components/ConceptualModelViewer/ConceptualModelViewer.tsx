import type { ConceptualModel } from '../../types';
import styles from './ConceptualModelViewer.module.css';

type ConceptualModelViewerProps = {
  model: ConceptualModel;
};

export function ConceptualModelViewer({ model }: ConceptualModelViewerProps) {
  return (
    <div className={styles.modelViewer}>
      <div>
        <h3>Entidades</h3>

        <div className={styles.cardsGrid}>
          {model.entities.map((entity) => (
            <article key={entity.id} className={styles.modelCard}>
              <h4>{entity.name}</h4>

              {entity.description && <p>{entity.description}</p>}

              <ul>
                {entity.attributes.map((attribute) => (
                  <li key={attribute.id}>
                    {attribute.identifier && <strong className={styles.primaryBadge}>PK</strong>}

                    <span>{attribute.name}</span>

                    <small className={styles.badge}>{attribute.type}</small>

                    {attribute.required && <em className={styles.muted}>obrigatório</em>}
                    {attribute.unique && <em className={styles.muted}>único</em>}
                    {attribute.multivalued && <em className={styles.muted}>multivalorado</em>}
                    {attribute.composite && <em className={styles.muted}>composto</em>}
                    {attribute.derived && <em className={styles.muted}>derivado</em>}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </div>

      <div>
        <h3>Relacionamentos</h3>

        <div className={styles.cardsGrid}>
          {model.relationships.map((relationship) => (
            <article key={relationship.id} className={styles.modelCard}>
              <h4>
                {relationship.name} <small className={styles.badge}>{relationship.type}</small>
              </h4>

              {relationship.description && <p>{relationship.description}</p>}

              <ul>
                {relationship.participants.map((participant) => (
                  <li key={participant.entityId}>
                    <span>{participant.entityId}</span>
                    <small className={styles.badge}>{participant.cardinality}</small>
                    {participant.role && <em className={styles.muted}>{participant.role}</em>}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </div>

      {model.ambiguities.length > 0 && (
        <div className={styles.ambiguities}>
          <h3>Ambiguidades</h3>

          <ul>
            {model.ambiguities.map((ambiguity) => (
              <li key={ambiguity.id}>{ambiguity.message}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

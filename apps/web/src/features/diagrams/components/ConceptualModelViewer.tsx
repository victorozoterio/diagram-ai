import type { ConceptualModel } from '../types/conceptual-model';

type ConceptualModelViewerProps = {
  model: ConceptualModel;
};

export function ConceptualModelViewer({ model }: ConceptualModelViewerProps) {
  return (
    <div className='model-viewer'>
      <div>
        <h3>Entidades</h3>

        <div className='cards-grid'>
          {model.entities.map((entity) => (
            <article key={entity.id} className='model-card'>
              <h4>{entity.name}</h4>

              {entity.description && <p>{entity.description}</p>}

              <ul>
                {entity.attributes.map((attribute) => (
                  <li key={attribute.id}>
                    {attribute.identifier && <strong>PK </strong>}
                    <span>{attribute.name}</span>
                    <small>{attribute.type}</small>

                    {attribute.required && <em> obrigatório</em>}
                    {attribute.unique && <em> único</em>}
                    {attribute.multivalued && <em> multivalorado</em>}
                    {attribute.composite && <em> composto</em>}
                    {attribute.derived && <em> derivado</em>}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </div>

      <div>
        <h3>Relacionamentos</h3>

        <div className='cards-grid'>
          {model.relationships.map((relationship) => (
            <article key={relationship.id} className='model-card'>
              <h4>
                {relationship.name} <small>{relationship.type}</small>
              </h4>

              {relationship.description && <p>{relationship.description}</p>}

              <ul>
                {relationship.participants.map((participant) => (
                  <li key={participant.entityId}>
                    <span>{participant.entityId}</span>
                    <small>{participant.cardinality}</small>
                    {participant.role && <em>{participant.role}</em>}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </div>

      {model.ambiguities.length > 0 && (
        <div className='ambiguities'>
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

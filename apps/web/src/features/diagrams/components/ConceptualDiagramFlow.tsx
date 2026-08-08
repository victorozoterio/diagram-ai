import { Background, Controls, type Edge, Handle, type Node, Position, ReactFlow } from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import type { ConceptualModel, Entity } from '../types';

type ConceptualDiagramFlowProps = {
  model: ConceptualModel;
};

function EntityNode({ data }: { data: Entity }) {
  return (
    <div className='entity-flow-node'>
      <strong>{data.name}</strong>

      {data.description && <p>{data.description}</p>}

      <ul>
        {data.attributes.map((attribute) => (
          <li key={attribute.id}>
            {attribute.identifier && <span className='attribute-tag primary'>PK</span>}

            <span>{attribute.name}</span>

            <small>{attribute.type}</small>

            {attribute.required && <span className='attribute-tag'>obrigatório</span>}
            {attribute.unique && <span className='attribute-tag'>único</span>}
            {attribute.multivalued && <span className='attribute-tag'>multivalorado</span>}
            {attribute.composite && <span className='attribute-tag'>composto</span>}
            {attribute.derived && <span className='attribute-tag'>derivado</span>}
          </li>
        ))}
      </ul>

      <Handle type='target' position={Position.Left} />
      <Handle type='source' position={Position.Right} />
    </div>
  );
}

const nodeTypes = {
  entity: EntityNode,
};

export function ConceptualDiagramFlow({ model }: ConceptualDiagramFlowProps) {
  const nodes: Node<Entity>[] = model.entities.map((entity, index) => ({
    id: entity.id,
    type: 'entity',
    position: {
      x: 80 + (index % 3) * 360,
      y: 80 + Math.floor(index / 3) * 280,
    },
    data: entity,
  }));

  const edges: Edge[] = model.relationships.flatMap((relationship) => {
    const [source, target] = relationship.participants;

    if (!source || !target) {
      return [];
    }

    return [
      {
        id: relationship.id,
        source: source.entityId,
        target: target.entityId,
        label: `${relationship.name} (${relationship.type})`,
        type: 'smoothstep',
      },
    ];
  });

  return (
    <div className='diagram-flow'>
      <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} fitView>
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  );
}

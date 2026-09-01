import { Handle, Position } from '@xyflow/react';
import { useState } from 'react';
import type { RelationshipNodeData } from '../flow.types';
import styles from './RelationshipNode.module.css';

export function RelationshipNode({ data }: { data: RelationshipNodeData }) {
  const [isEditing, setIsEditing] = useState(false);
  const isGeneralization = data.relationship.kind === 'generalization' || data.relationship.kind === 'specialization';

  return (
    <div className={`${styles.node} ${isGeneralization ? styles.generalization : ''}`}>
      {isGeneralization && (
        <svg className={styles.generalizationShape} viewBox='0 0 102 86' aria-hidden='true'>
          <path d='M 51 3 L 99 83 L 3 83 Z' fill='#fff' stroke='#7c3aed' strokeWidth='4' />
        </svg>
      )}
      {isEditing ? (
        <input
          className={`${styles.nameInput} nodrag nopan`}
          value={data.relationship.name}
          onChange={(event) => data.onUpdateRelationship?.(data.relationship.id, { name: event.target.value })}
          onBlur={() => setIsEditing(false)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === 'Escape') setIsEditing(false);
            event.stopPropagation();
          }}
          aria-label='Nome do relacionamento'
        />
      ) : (
        <button className={`${styles.nameButton} nopan`} type='button' onClick={() => setIsEditing(true)}>
          {data.relationship.name}
        </button>
      )}
      <Handle id='target-left' type='target' position={Position.Left} />
      <Handle id='source-right' type='source' position={Position.Right} />
      <Handle id='source-top' type='source' position={Position.Top} />
      <Handle id='source-bottom' type='source' position={Position.Bottom} />
    </div>
  );
}

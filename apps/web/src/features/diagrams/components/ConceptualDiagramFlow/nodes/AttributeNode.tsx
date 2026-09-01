import { useState } from 'react';
import type { AttributeNodeData } from '../flow.types';
import styles from './AttributeNode.module.css';
import { ConnectionHandles } from './ConnectionHandles';

export function AttributeNode({ data }: { data: AttributeNodeData }) {
  const [isEditing, setIsEditing] = useState(false);
  const { attribute } = data;

  return (
    <div
      className={`${styles.node} ${attribute.multivalued ? styles.multivalued : ''} ${attribute.derived ? styles.derived : ''} ${attribute.identifier ? styles.identifier : ''} ${attribute.composite ? styles.composite : ''} ${data.selected ? styles.selected : ''}`}
    >
      {isEditing ? (
        <input
          className='nodrag'
          value={attribute.name}
          onChange={(event) => data.onUpdateAttribute?.(data.entityId, attribute.id, { name: event.target.value })}
          onBlur={() => setIsEditing(false)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === 'Escape') setIsEditing(false);
          }}
          aria-label='Nome do atributo'
        />
      ) : (
        <button
          className={styles.nameButton}
          type='button'
          onClick={() => {
            data.onSelectAttribute?.(data.entityId, attribute.id);
            setIsEditing(true);
          }}
        >
          {attribute.name}
        </button>
      )}
      <ConnectionHandles prefix='attribute' />
    </div>
  );
}

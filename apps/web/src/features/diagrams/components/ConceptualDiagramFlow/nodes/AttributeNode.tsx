import { type KeyboardEvent, useEffect, useRef, useState } from 'react';
import type { AttributeNodeData } from '../flow.types';
import styles from './AttributeNode.module.css';
import { ConnectionHandles } from './ConnectionHandles';

export function AttributeNode({ data, selected }: { data: AttributeNodeData; selected?: boolean }) {
  const [isEditing, setIsEditing] = useState(false);
  const [draftName, setDraftName] = useState(data.attribute.name);
  const inputRef = useRef<HTMLInputElement>(null);
  const { attribute } = data;

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);

  function saveName() {
    const name = draftName.trim();
    if (name) data.onUpdateAttribute?.(data.entityId, attribute.id, { name });
    else setDraftName(attribute.name);
    setIsEditing(false);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape') {
      setDraftName(attribute.name);
      setIsEditing(false);
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      saveName();
    }
  }

  return (
    <div
      className={`${styles.node} ${attribute.multivalued ? styles.multivalued : ''} ${attribute.derived ? styles.derived : ''} ${attribute.identifier ? styles.identifier : ''} ${attribute.composite ? styles.composite : ''} ${selected || data.selected ? styles.selected : ''}`}
    >
      {isEditing ? (
        <input
          ref={inputRef}
          className='nodrag'
          value={draftName}
          onChange={(event) => setDraftName(event.target.value)}
          onBlur={saveName}
          onKeyDown={handleKeyDown}
          aria-label='Nome do atributo'
        />
      ) : (
        <button
          className={styles.nameButton}
          type='button'
          onClick={() => {
            data.onSelectAttribute?.(data.entityId, attribute.id);
            setDraftName(attribute.name);
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

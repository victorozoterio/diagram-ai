import { Handle, Position } from '@xyflow/react';
import { type KeyboardEvent, useEffect, useRef, useState } from 'react';
import type { EntityNodeData } from '../flow.types';
import styles from './EntityNode.module.css';

export function EntityNode({ data }: { data: EntityNodeData }) {
  const [isEditing, setIsEditing] = useState(false);
  const [draftName, setDraftName] = useState(data.name);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);

  function saveName() {
    const name = draftName.trim();
    if (name) data.onUpdateEntity?.(data.id, { name });
    else setDraftName(data.name);
    setIsEditing(false);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape') {
      setDraftName(data.name);
      setIsEditing(false);
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      saveName();
    }
  }

  return (
    <div
      className={`${styles.node} ${data.kind === 'weak' ? styles.weak : ''} ${data.kind === 'associative' ? styles.associative : ''} ${data.isSelected ? styles.selected : ''}`}
    >
      {isEditing ? (
        <input
          ref={inputRef}
          className={`${styles.nameInput} nodrag`}
          value={draftName}
          onChange={(event) => setDraftName(event.target.value)}
          onBlur={saveName}
          onKeyDown={handleKeyDown}
          aria-label='Nome da entidade'
        />
      ) : (
        <button
          className={styles.nameButton}
          type='button'
          onClick={() => {
            data.onSelectEntity?.(data.id);
            setDraftName(data.name);
            setIsEditing(true);
          }}
          aria-label={`Editar nome da entidade ${data.name}`}
        >
          {data.name}
        </button>
      )}
      <Handle id='entity-left' type='target' position={Position.Left} />
      <Handle id='entity-right' type='source' position={Position.Right} />
      <Handle id='entity-top' type='source' position={Position.Top} />
      <Handle id='entity-bottom' type='source' position={Position.Bottom} />
    </div>
  );
}

import { type KeyboardEvent, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { EntityNodeData } from '../flow.types';
import { ConnectionHandles } from './ConnectionHandles';
import styles from './EntityNode.module.css';

export function EntityNode({ data, selected }: { data: EntityNodeData; selected?: boolean }) {
  const [isEditing, setIsEditing] = useState(false);
  const [draftName, setDraftName] = useState(data.name);
  const [associativeEditPosition, setAssociativeEditPosition] = useState<{ left: number; top: number } | null>(null);
  const [associativeEditorWidth, setAssociativeEditorWidth] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const nodeRef = useRef<HTMLDivElement>(null);
  const nameTextRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);

  useLayoutEffect(() => {
    if (data.kind !== 'associative' || !isEditing || !inputRef.current) return;

    setAssociativeEditorWidth(measureTextWidth(inputRef.current, draftName || ' '));
  }, [data.kind, draftName, isEditing]);

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
      ref={nodeRef}
      className={`${styles.node} ${data.kind === 'weak' ? styles.weak : ''} ${data.kind === 'associative' ? styles.associative : ''} ${selected || data.isSelected ? styles.selected : ''}`}
    >
      {data.kind === 'associative' && (
        <svg className={styles.associativeShape} viewBox='0 0 170 64' aria-hidden='true'>
          <path d='M 85 2 L 168 32 L 85 62 L 2 32 Z' fill='#fff' stroke='#4338ca' strokeWidth='2' />
        </svg>
      )}
      {isEditing ? (
        <input
          ref={inputRef}
          className={`${styles.nameInput} ${data.kind === 'associative' ? styles.associativeEditor : ''} nodrag`}
          value={draftName}
          onChange={(event) => setDraftName(event.target.value)}
          onBlur={saveName}
          onKeyDown={handleKeyDown}
          style={
            data.kind === 'associative'
              ? {
                  fontSize: `${getAssociativeFontSize(data.name)}px`,
                  width: `${associativeEditorWidth}px`,
                  left: `${associativeEditPosition?.left ?? 0}px`,
                  top: `${associativeEditPosition?.top ?? 0}px`,
                }
              : undefined
          }
          aria-label='Nome da entidade'
        />
      ) : (
        <button
          className={`${styles.nameButton} ${data.kind === 'associative' ? styles.associativeName : ''}`}
          type='button'
          onClick={() => {
            data.onSelectEntity?.(data.id);
            setDraftName(data.name);
            if (data.kind === 'associative' && nodeRef.current && nameTextRef.current) {
              const nodeRect = nodeRef.current.getBoundingClientRect();
              const textRect = nameTextRef.current.getBoundingClientRect();
              setAssociativeEditPosition({
                left: textRect.left - nodeRect.left,
                top: textRect.top - nodeRect.top - 5,
              });
            }
            setIsEditing(true);
          }}
          aria-label={`Editar nome da entidade ${data.name}`}
          style={data.kind === 'associative' ? { fontSize: `${getAssociativeFontSize(data.name)}px` } : undefined}
        >
          <span ref={nameTextRef}>{data.name}</span>
        </button>
      )}
      <ConnectionHandles prefix='entity' />
    </div>
  );
}

function getAssociativeFontSize(name: string) {
  return Math.max(9, Math.min(16, 240 / Math.max(name.trim().length, 1)));
}

function measureTextWidth(input: HTMLInputElement, value: string) {
  const context = document.createElement('canvas').getContext('2d');
  if (!context) return value.length * 8;

  const style = window.getComputedStyle(input);
  context.font = `${style.fontStyle} ${style.fontVariant} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
  const letterSpacing = Number.parseFloat(style.letterSpacing);
  const spacingWidth = Number.isFinite(letterSpacing) ? Math.max(0, value.length - 1) * letterSpacing : 0;

  return Math.ceil(context.measureText(value).width + spacingWidth);
}

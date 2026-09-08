import { useRef } from 'react';
import type { EntityNodeData } from '../flow.types';
import { ConnectionHandles } from './ConnectionHandles';
import { EditableNodeName, type TextSafeArea } from './EditableNodeName';
import styles from './EntityNode.module.css';

export function EntityNode({ data, selected }: { data: EntityNodeData; selected?: boolean }) {
  const nodeRef = useRef<HTMLDivElement>(null);
  const textSafeArea: TextSafeArea =
    data.kind === 'associative'
      ? { maxWidth: 82, maxHeight: 30, baseFontSize: 16, minFontSize: 8, horizontalPadding: 12, verticalPadding: 8 }
      : { maxWidth: 138, maxHeight: 40, baseFontSize: 16, minFontSize: 9, horizontalPadding: 8, verticalPadding: 6 };

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
      <EditableNodeName
        value={data.name}
        ariaLabel={`Editar nome da entidade ${data.name}`}
        containerRef={nodeRef}
        normalClassName={`${styles.nameButton} ${data.kind === 'associative' ? styles.associativeName : ''}`}
        editingClassName={`${styles.nameInput} ${data.kind === 'associative' ? styles.associativeEditor : ''}`}
        textSafeArea={textSafeArea}
        onSave={(name) => data.onUpdateEntity?.(data.id, { name })}
        onSelect={() => data.onSelectEntity?.(data.id)}
      />
      <ConnectionHandles prefix='entity' />
    </div>
  );
}

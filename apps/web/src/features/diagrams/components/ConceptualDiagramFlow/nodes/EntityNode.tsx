import { useRef } from 'react';
import type { EntityNodeData } from '../flow.types';
import { ConnectionHandles } from './ConnectionHandles';
import { EditableNodeName, type TextSafeArea } from './EditableNodeName';
import styles from './EntityNode.module.css';
import { ResizableNodeControls } from './ResizableNodeControls';

export function EntityNode({ data, selected }: { data: EntityNodeData; selected?: boolean }) {
  const nodeRef = useRef<HTMLDivElement>(null);
  const isSelected = Boolean(selected || data.isSelected);
  const textSafeArea: TextSafeArea =
    data.kind === 'associative'
      ? {
          maxWidth: Math.max(50, data.size.width * 0.48),
          maxHeight: Math.max(24, data.size.height * 0.48),
          baseFontSize: Math.min(20, Math.max(12, data.size.height * 0.25)),
          minFontSize: 8,
          horizontalPadding: 12,
          verticalPadding: 8,
        }
      : {
          maxWidth: Math.max(72, data.size.width - 32),
          maxHeight: Math.max(28, data.size.height - 20),
          baseFontSize: Math.min(20, Math.max(12, data.size.height * 0.25)),
          minFontSize: 9,
          horizontalPadding: 8,
          verticalPadding: 6,
        };

  return (
    <div
      ref={nodeRef}
      className={`${styles.node} ${data.kind === 'weak' ? styles.weak : ''} ${data.kind === 'associative' ? styles.associative : ''} ${isSelected ? styles.selected : ''}`}
    >
      <ResizableNodeControls
        nodeId={data.id}
        selected={isSelected}
        minSize={data.minSize}
        color='#4338ca'
        onResizeStart={data.onResizeStart}
        onResize={data.onResize}
        onResizeEnd={data.onResizeEnd}
      />
      {data.kind === 'associative' && (
        <svg className={styles.associativeShape} viewBox='0 0 170 64' preserveAspectRatio='none' aria-hidden='true'>
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

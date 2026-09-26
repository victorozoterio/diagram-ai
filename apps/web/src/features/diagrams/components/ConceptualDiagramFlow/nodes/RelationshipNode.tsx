import { useRef } from 'react';
import type { RelationshipNodeData } from '../flow.types';
import { ConnectionHandles } from './ConnectionHandles';
import { EditableNodeName } from './EditableNodeName';
import styles from './RelationshipNode.module.css';
import { ResizableNodeControls } from './ResizableNodeControls';

export function RelationshipNode({ data, selected }: { data: RelationshipNodeData; selected?: boolean }) {
  const nodeRef = useRef<HTMLDivElement>(null);
  const isGeneralization = data.relationship.kind === 'generalization' || data.relationship.kind === 'specialization';
  const isSelected = Boolean(selected);

  return (
    <div
      ref={nodeRef}
      className={`${styles.node} ${isGeneralization ? styles.generalization : ''} ${isSelected ? styles.selected : ''}`}
    >
      <ResizableNodeControls
        nodeId={`relationship:${data.relationship.id}`}
        selected={isSelected}
        minSize={data.minSize}
        color={isGeneralization ? '#7c3aed' : '#c2410c'}
        onResizeStart={data.onResizeStart}
        onResize={data.onResize}
        onResizeEnd={data.onResizeEnd}
      />
      {isGeneralization && (
        <svg className={styles.generalizationShape} viewBox='0 0 102 86' preserveAspectRatio='none' aria-hidden='true'>
          <path d='M 51 3 L 99 83 L 3 83 Z' fill='#fff' stroke='#7c3aed' strokeWidth='4' />
        </svg>
      )}
      {isGeneralization ? (
        <span className={`${styles.nameButton} nopan`}>Gen</span>
      ) : (
        <EditableNodeName
          value={data.relationship.name}
          ariaLabel={`Editar nome do relacionamento ${data.relationship.name}`}
          containerRef={nodeRef}
          normalClassName={`${styles.nameButton} nopan`}
          editingClassName={`${styles.nameInput} nopan`}
          textSafeArea={{
            maxWidth: Math.max(34, Math.min(data.size.width, data.size.height) * 0.55),
            maxHeight: Math.max(24, Math.min(data.size.width, data.size.height) * 0.34),
            baseFontSize: Math.min(16, Math.max(9, Math.min(data.size.width, data.size.height) * 0.12)),
            minFontSize: 7,
            horizontalPadding: 6,
            verticalPadding: 6,
          }}
          onSave={(name) => data.onUpdateRelationship?.(data.relationship.id, { name })}
          stopPropagationOnKeyDown
        />
      )}
      <ConnectionHandles
        prefix='relationship'
        geometry={isGeneralization ? 'triangle' : 'diamond'}
        size={data.size}
        middleHandleIds={{
          left: 'target-left',
          right: 'source-right',
          top: 'source-top',
          bottom: 'source-bottom',
        }}
      />
    </div>
  );
}

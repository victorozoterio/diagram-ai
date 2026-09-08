import { useRef } from 'react';
import type { RelationshipNodeData } from '../flow.types';
import { ConnectionHandles } from './ConnectionHandles';
import { EditableNodeName } from './EditableNodeName';
import styles from './RelationshipNode.module.css';

export function RelationshipNode({ data, selected }: { data: RelationshipNodeData; selected?: boolean }) {
  const nodeRef = useRef<HTMLDivElement>(null);
  const isGeneralization = data.relationship.kind === 'generalization' || data.relationship.kind === 'specialization';

  return (
    <div
      ref={nodeRef}
      className={`${styles.node} ${isGeneralization ? styles.generalization : ''} ${selected ? styles.selected : ''}`}
    >
      {isGeneralization && (
        <svg className={styles.generalizationShape} viewBox='0 0 102 86' aria-hidden='true'>
          <path d='M 51 3 L 99 83 L 3 83 Z' fill='#fff' stroke='#7c3aed' strokeWidth='4' />
        </svg>
      )}
      <EditableNodeName
        value={data.relationship.name}
        ariaLabel={`Editar nome do relacionamento ${data.relationship.name}`}
        containerRef={nodeRef}
        normalClassName={`${styles.nameButton} nopan`}
        editingClassName={`${styles.nameInput} nopan`}
        textSafeArea={
          isGeneralization
            ? {
                maxWidth: 34,
                maxHeight: 28,
                baseFontSize: 11,
                minFontSize: 7,
                horizontalPadding: 4,
                verticalPadding: 6,
              }
            : {
                maxWidth: 48,
                maxHeight: 30,
                baseFontSize: 11,
                minFontSize: 7,
                horizontalPadding: 6,
                verticalPadding: 6,
              }
        }
        onSave={(name) => data.onUpdateRelationship?.(data.relationship.id, { name })}
        stopPropagationOnKeyDown
      />
      <ConnectionHandles
        prefix='relationship'
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

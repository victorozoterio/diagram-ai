import { useRef } from 'react';
import type { AttributeNodeData } from '../flow.types';
import styles from './AttributeNode.module.css';
import { ConnectionHandles } from './ConnectionHandles';
import { EditableNodeName } from './EditableNodeName';

export function AttributeNode({ data, selected }: { data: AttributeNodeData; selected?: boolean }) {
  const nodeRef = useRef<HTMLDivElement>(null);
  const { attribute } = data;

  return (
    <div
      ref={nodeRef}
      className={`${styles.node} ${attribute.multivalued ? styles.multivalued : ''} ${attribute.derived ? styles.derived : ''} ${attribute.identifier ? styles.identifier : ''} ${attribute.composite ? styles.composite : ''} ${selected || data.selected ? styles.selected : ''}`}
    >
      <EditableNodeName
        value={attribute.name}
        ariaLabel={`Editar nome do atributo ${attribute.name}`}
        containerRef={nodeRef}
        normalClassName={styles.nameButton}
        editingClassName={styles.nameInput}
        textSafeArea={{
          maxWidth: 92,
          maxHeight: 32,
          baseFontSize: 12,
          minFontSize: 8,
          horizontalPadding: 10,
          verticalPadding: 6,
        }}
        onSave={(name) => data.onUpdateAttribute?.(data.entityId, attribute.id, { name })}
        onSelect={() => data.onSelectAttribute?.(data.entityId, attribute.id)}
      />
      <ConnectionHandles prefix='attribute' />
    </div>
  );
}

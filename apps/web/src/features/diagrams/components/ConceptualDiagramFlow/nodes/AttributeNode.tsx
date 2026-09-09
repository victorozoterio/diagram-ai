import { useRef } from 'react';
import type { AttributeNodeData } from '../flow.types';
import styles from './AttributeNode.module.css';
import { ConnectionHandles } from './ConnectionHandles';
import { EditableNodeName } from './EditableNodeName';
import { ResizableNodeControls } from './ResizableNodeControls';

export function AttributeNode({ data, selected }: { data: AttributeNodeData; selected?: boolean }) {
  const nodeRef = useRef<HTMLDivElement>(null);
  const { attribute } = data;
  const isSelected = Boolean(selected || data.selected);

  return (
    <div
      ref={nodeRef}
      className={`${styles.node} ${attribute.multivalued ? styles.multivalued : ''} ${attribute.derived ? styles.derived : ''} ${attribute.identifier ? styles.identifier : ''} ${attribute.composite ? styles.composite : ''} ${isSelected ? styles.selected : ''}`}
    >
      <ResizableNodeControls
        nodeId={data.nodeId}
        selected={isSelected}
        minSize={data.minSize}
        color='#64748b'
        onResizeStart={data.onResizeStart}
        onResize={data.onResize}
        onResizeEnd={data.onResizeEnd}
      />
      <EditableNodeName
        value={attribute.name}
        ariaLabel={`Editar nome do atributo ${attribute.name}`}
        containerRef={nodeRef}
        normalClassName={styles.nameButton}
        editingClassName={styles.nameInput}
        textSafeArea={{
          maxWidth: Math.max(44, data.size.width * 0.7),
          maxHeight: Math.max(24, data.size.height * 0.5),
          baseFontSize: Math.min(18, Math.max(12, data.size.height * 0.2)),
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

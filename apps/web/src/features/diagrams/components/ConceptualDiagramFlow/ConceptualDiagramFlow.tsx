import { Background, ConnectionMode, Controls, MiniMap, ReactFlow } from '@xyflow/react';
import { useEffect } from 'react';
import styles from './ConceptualDiagramFlow.module.css';
import { DiagramExportMenu } from './DiagramExportMenu';
import { AttributeEdge } from './edges/AttributeEdge';
import { RelationshipEdge } from './edges/RelationshipEdge';
import { FitViewOnNodeChange } from './FitViewOnNodeChange';
import type { ConceptualDiagramFlowProps } from './flow.types';
import { AttributeNode } from './nodes/AttributeNode';
import { EntityNode } from './nodes/EntityNode';
import { RelationshipNode } from './nodes/RelationshipNode';
import { useFlowEdges } from './useFlowEdges';
import { useFlowInteractions } from './useFlowInteractions';
import { useFlowNodes } from './useFlowNodes';

const nodeTypes = {
  entity: EntityNode,
  attribute: AttributeNode,
  relationship: RelationshipNode,
};

const edgeTypes = {
  attribute: AttributeEdge,
  relationship: RelationshipEdge,
};

/** Camada visual do editor: adapta o modelo conceitual para o React Flow. */
export function ConceptualDiagramFlow(props: ConceptualDiagramFlowProps) {
  const { nodes, handleNodesChange, selectAllNodes } = useFlowNodes(props);
  const {
    flowWrapperRef,
    setFlowInstance,
    handleBeforeDelete,
    handleNodesDelete,
    handleEdgesDelete,
    handleConnect,
    handleReconnect,
    handleDrop,
  } = useFlowInteractions(props);
  const { edges, handleEdgesChange, selectAllEdges } = useFlowEdges(props, handleReconnect);

  useEffect(() => {
    function handleGlobalKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key.toLowerCase() !== 'a' || (!event.ctrlKey && !event.metaKey)) {
        return;
      }

      if (isEditableTarget(document.activeElement) || isEditableTarget(event.target)) {
        return;
      }

      event.preventDefault();
      selectAllNodes();
      selectAllEdges();
    }

    window.addEventListener('keydown', handleGlobalKeyDown, true);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown, true);
  }, [selectAllEdges, selectAllNodes]);

  return (
    <div
      ref={flowWrapperRef}
      className={styles.diagramFlow}
      role='application'
      aria-label='Canvas do modelo conceitual'
      onDragOver={(event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'copy';
      }}
      onDrop={handleDrop}
    >
      <DiagramExportMenu
        flowWrapperRef={flowWrapperRef}
        nodes={nodes}
        portalTarget={props.exportMenuTarget}
        disabled={props.exportDisabled}
      />
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onBeforeDelete={handleBeforeDelete}
        onNodesDelete={handleNodesDelete}
        onEdgesDelete={handleEdgesDelete}
        onConnect={handleConnect}
        onEdgeClick={props.onClearSelection}
        elementsSelectable
        edgesFocusable
        onNodeClick={(_, node) => {
          if (node.type === 'relationship') props.onClearSelection?.();
        }}
        onPaneClick={props.onClearSelection}
        onInit={setFlowInstance}
        connectionMode={ConnectionMode.Loose}
        selectionOnDrag
        panOnDrag={[1]}
        panOnScroll
        zoomOnScroll
        zoomOnPinch
        fitView
        deleteKeyCode={['Backspace', 'Delete']}
        selectionKeyCode={['Shift', 'Meta']}
        multiSelectionKeyCode={['Shift', 'Meta']}
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={24} size={1} color='#94a3b8' />
        <Controls />
        <MiniMap pannable zoomable />
        <FitViewOnNodeChange key={props.layoutVersion} nodeCount={nodes.length} fitViewKey={props.layoutVersion ?? 0} />
      </ReactFlow>
    </div>
  );
}

function isEditableTarget(target: EventTarget | Element | null) {
  if (!(target instanceof Element)) {
    return false;
  }

  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement ||
    (target instanceof HTMLElement && target.isContentEditable) ||
    Boolean(target.closest('input, textarea, select, [contenteditable="true"]'))
  );
}

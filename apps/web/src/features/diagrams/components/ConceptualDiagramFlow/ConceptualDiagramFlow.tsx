import { Background, ConnectionMode, Controls, MiniMap, ReactFlow } from '@xyflow/react';
import { useMemo } from 'react';
import styles from './ConceptualDiagramFlow.module.css';
import { RelationshipEdge } from './edges/RelationshipEdge';
import { FitViewOnNodeChange } from './FitViewOnNodeChange';
import type { ConceptualDiagramFlowProps } from './flow.types';
import { buildFlowEdges } from './flow-mappers';
import { AttributeNode } from './nodes/AttributeNode';
import { EntityNode } from './nodes/EntityNode';
import { RelationshipNode } from './nodes/RelationshipNode';
import { useFlowInteractions } from './useFlowInteractions';
import { useFlowNodes } from './useFlowNodes';

const nodeTypes = {
  entity: EntityNode,
  attribute: AttributeNode,
  relationship: RelationshipNode,
};

const edgeTypes = {
  relationship: RelationshipEdge,
};

/** Camada visual do editor: adapta o modelo conceitual para o React Flow. */
export function ConceptualDiagramFlow(props: ConceptualDiagramFlowProps) {
  const { model, onCycleRelationshipCardinality } = props;
  const { nodes, handleNodesChange } = useFlowNodes(props);
  const { flowWrapperRef, setFlowInstance, handleNodesDelete, handleConnect, handleDrop, handleEdgesDelete } =
    useFlowInteractions(props);
  const edges = useMemo(
    () => buildFlowEdges(model, { onCycleRelationshipCardinality }),
    [model, onCycleRelationshipCardinality],
  );

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
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={handleNodesChange}
        onNodesDelete={handleNodesDelete}
        onEdgesDelete={handleEdgesDelete}
        onConnect={handleConnect}
        onInit={setFlowInstance}
        connectionMode={ConnectionMode.Loose}
        fitView
        deleteKeyCode={['Backspace', 'Delete']}
        selectionKeyCode={['Shift', 'Meta']}
        multiSelectionKeyCode={['Shift', 'Meta']}
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={24} size={1} color='#94a3b8' />
        <Controls />
        <MiniMap pannable zoomable />
        <FitViewOnNodeChange nodeCount={nodes.length} />
      </ReactFlow>
    </div>
  );
}

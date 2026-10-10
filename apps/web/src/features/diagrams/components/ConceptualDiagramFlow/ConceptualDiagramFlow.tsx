import { Background, ConnectionMode, Controls, MiniMap, ReactFlow } from '@xyflow/react';
import { useCallback, useEffect, useRef } from 'react';
import { createDiagramAiProject } from '../../types';
import { useSelectAllShortcut } from '../use-select-all-shortcut';
import styles from './ConceptualDiagramFlow.module.css';
import { DiagramExportMenu } from './DiagramExportMenu';
import { ChenConnectionLine } from './edges/ChenConnectionLine';
import { FitViewOnNodeChange } from './FitViewOnNodeChange';
import type { ConceptualDiagramFlowProps } from './flow.types';
import { conceptualEdgeTypes, conceptualNodeTypes } from './flow-renderers';
import { RestoreViewport } from './RestoreViewport';
import { useFlowEdges } from './useFlowEdges';
import { useFlowInteractions } from './useFlowInteractions';
import { useFlowNodes } from './useFlowNodes';

/** Camada visual do editor: adapta o modelo conceitual para o React Flow. */
export function ConceptualDiagramFlow(props: ConceptualDiagramFlowProps) {
  const { nodes, handleNodesChange, selectAllNodes } = useFlowNodes(props);
  const {
    flowWrapperRef,
    flowInstance,
    setFlowInstance,
    handleBeforeDelete,
    handleNodesDelete,
    handleEdgesDelete,
    handleConnect,
    handleReconnect,
    handleDrop,
  } = useFlowInteractions(props);
  const { edges, handleEdgesChange, selectAllEdges } = useFlowEdges(props, handleReconnect);

  const editableProjectFactory = useRef<() => ReturnType<typeof createDiagramAiProject>>(() =>
    createDiagramAiProject({
      modelType: 'conceptual',
      semanticModel: props.model,
      nodes,
      edges,
      viewport: flowInstance?.getViewport(),
      visualState: {
        entityPositions: props.entityPositions,
        elementPositions: props.elementPositions,
        nodeSizes: props.nodeSizes,
        edgeControlPoints: props.edgeControlPoints,
      },
    }),
  );
  editableProjectFactory.current = () =>
    createDiagramAiProject({
      modelType: 'conceptual',
      semanticModel: props.model,
      nodes,
      edges,
      viewport: flowInstance?.getViewport(),
      visualState: {
        entityPositions: props.entityPositions,
        elementPositions: props.elementPositions,
        nodeSizes: props.nodeSizes,
        edgeControlPoints: props.edgeControlPoints,
      },
    });

  const getEditableProject = useCallback(() => editableProjectFactory.current(), []);

  useEffect(() => {
    props.onEditableProjectReady?.(getEditableProject);
  }, [getEditableProject, props.onEditableProjectReady]);

  useEffect(() => {
    const element = flowWrapperRef.current;
    if (!element || !props.onViewportSizeChange) return;

    const reportSize = () => {
      props.onViewportSizeChange?.({ width: element.clientWidth, height: element.clientHeight });
    };
    reportSize();
    const observer = new ResizeObserver(reportSize);
    observer.observe(element);
    return () => observer.disconnect();
  }, [flowWrapperRef, props.onViewportSizeChange]);

  useSelectAllShortcut({ onSelectAllNodes: selectAllNodes, onSelectAllEdges: selectAllEdges });

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
        onOpenProject={props.onOpenProject}
        onNavigateToDiagrams={props.onNavigateToDiagrams}
        getEditableProject={getEditableProject}
        onSaveProject={props.onSaveProject}
        isSavingProject={props.isSavingProject}
      />
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={conceptualNodeTypes}
        edgeTypes={conceptualEdgeTypes}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onBeforeDelete={handleBeforeDelete}
        onNodesDelete={handleNodesDelete}
        onEdgesDelete={handleEdgesDelete}
        onConnect={handleConnect}
        connectionLineComponent={ChenConnectionLine}
        onEdgeClick={props.onClearSelection}
        elementsSelectable
        edgesFocusable
        onNodeClick={(_, node) => {
          if (node.type === 'relationship') props.onClearSelection?.();
        }}
        onPaneClick={props.onClearSelection}
        onInit={setFlowInstance}
        onMoveEnd={(event, viewport) => {
          if (!event) return;

          props.onViewportChange?.(viewport);
          props.onVisualChange?.();
        }}
        connectionMode={ConnectionMode.Loose}
        selectionOnDrag
        panOnDrag={[1]}
        panOnScroll
        zoomOnScroll
        zoomOnPinch
        minZoom={0.1}
        fitView={!props.restoredViewport}
        deleteKeyCode={['Backspace', 'Delete']}
        selectionKeyCode={['Shift', 'Meta']}
        multiSelectionKeyCode={['Shift', 'Meta']}
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={24} size={1} color='#94a3b8' />
        <Controls />
        <MiniMap pannable zoomable />
        <FitViewOnNodeChange
          key={props.layoutVersion}
          nodeCount={nodes.length}
          fitViewKey={props.layoutVersion ?? 0}
          skipFitView={Boolean(props.restoredViewport)}
          onFitted={props.onViewportChange}
        />
        <RestoreViewport viewport={props.restoredViewport} restoreKey={props.viewportRestoreVersion} />
      </ReactFlow>
    </div>
  );
}

import {
  ConnectionMode,
  type Edge,
  getViewportForBounds,
  type Node,
  ReactFlow,
  ReactFlowProvider,
  useNodesInitialized,
  useReactFlow,
  useStore,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { FiAlertTriangle, FiFileText, FiPlus, FiSearch, FiTrash2 } from 'react-icons/fi';
import { type DiagramSummary, deleteDiagram, listDiagrams, renameDiagram } from '@/api/diagrams.api';
import { type AuthenticatedUser, AuthenticatedUserMenu } from '@/features/auth/components/AuthenticatedUserMenu';
import { buildFlowEdges, buildFlowNodes } from '../../components/ConceptualDiagramFlow/flow-mappers';
import { conceptualEdgeTypes, conceptualNodeTypes } from '../../components/ConceptualDiagramFlow/flow-renderers';
import { logicalEdgeTypes, logicalNodeTypes } from '../../components/LogicalModelFlow/LogicalModelFlow';
import { useInlineDiagramRename } from '../../hooks/useInlineDiagramRename';
import type { ConceptualModel, DiagramAiDocument, DiagramAiProject } from '../../types';
import styles from './MyDiagramsPage.module.css';

type MyDiagramsPageProps = {
  onNewDiagram: () => void;
  onOpenDiagram: (diagramId: string) => void;
  onSignOut: () => void;
  user: AuthenticatedUser;
};

/** Mantém a semântica dos handles do editor, que podem atuar nos dois sentidos. */
export const PREVIEW_CONNECTION_MODE = ConnectionMode.Loose;
const PREVIEW_MIN_ZOOM = 0.001;
const PREVIEW_MAX_ZOOM = 2;
const PREVIEW_PADDING = 0.16;

export function MyDiagramsPage({ onNewDiagram, onOpenDiagram, onSignOut, user }: MyDiagramsPageProps) {
  const [diagrams, setDiagrams] = useState<DiagramSummary[]>([]);
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [diagramPendingDeletion, setDiagramPendingDeletion] = useState<DiagramSummary | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const loadDiagrams = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      setDiagrams(await listDiagrams());
    } catch {
      setError('Não foi possível carregar seus diagramas. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDiagrams();
  }, [loadDiagrams]);

  const filteredDiagrams = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('pt-BR');
    if (!normalizedQuery) return diagrams;

    return diagrams.filter((diagram) => diagram.name.toLocaleLowerCase('pt-BR').includes(normalizedQuery));
  }, [diagrams, query]);

  async function saveRename(diagramId: string, name: string) {
    try {
      const updatedDiagram = await renameDiagram(diagramId, name);
      setDiagrams((currentDiagrams) =>
        currentDiagrams.map((diagram) =>
          diagram.id === updatedDiagram.id
            ? { ...diagram, name: updatedDiagram.name, updatedAt: updatedDiagram.updatedAt }
            : diagram,
        ),
      );
      setActionError(null);
    } catch {
      setActionError('Não foi possível renomear o diagrama.');
    }
  }

  const cancelDelete = useCallback(() => {
    if (isDeleting) return;

    setDiagramPendingDeletion(null);
    setDeleteError(null);
  }, [isDeleting]);

  useEffect(() => {
    if (!diagramPendingDeletion) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        cancelDelete();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cancelDelete, diagramPendingDeletion]);

  async function confirmDelete() {
    if (!diagramPendingDeletion || isDeleting) return;

    setIsDeleting(true);
    setDeleteError(null);

    try {
      await deleteDiagram(diagramPendingDeletion.id);
      setDiagrams((currentDiagrams) => currentDiagrams.filter((diagram) => diagram.id !== diagramPendingDeletion.id));
      setDiagramPendingDeletion(null);
      setActionError(null);
    } catch {
      setDeleteError('Não foi possível excluir o diagrama. Tente novamente.');
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div className={styles.brand}>
          <span className={styles.logoMark}>D</span>
          <span>Diagram.AI</span>
        </div>
        <AuthenticatedUserMenu onSignOut={onSignOut} user={user} />
      </header>

      <section className={styles.content} aria-labelledby='my-diagrams-title'>
        <div className={styles.heading}>
          <div>
            <h1 id='my-diagrams-title'>Meus diagramas</h1>
            <p>Crie, abra e organize seus modelos salvos na nuvem.</p>
          </div>
          <button className={styles.newDiagramButton} onClick={onNewDiagram} type='button'>
            <FiPlus aria-hidden='true' />
            Novo diagrama
          </button>
        </div>

        <label className={styles.search}>
          <FiSearch aria-hidden='true' />
          <span className={styles.srOnly}>Buscar diagramas</span>
          <input
            type='search'
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder='Buscar por nome'
          />
        </label>

        {isLoading ? (
          <p className={styles.status}>Carregando diagramas...</p>
        ) : error ? (
          <div className={styles.status} role='alert'>
            <p>{error}</p>
            <button onClick={() => void loadDiagrams()} type='button'>
              Tentar novamente
            </button>
          </div>
        ) : diagrams.length === 0 ? (
          <EmptyState onNewDiagram={onNewDiagram} />
        ) : filteredDiagrams.length === 0 ? (
          <p className={styles.status}>Nenhum diagrama encontrado para esta busca.</p>
        ) : (
          <div className={styles.grid}>
            {filteredDiagrams.map((diagram) => (
              <DiagramCard
                diagram={diagram}
                key={diagram.id}
                onOpen={() => onOpenDiagram(diagram.id)}
                onRename={(name) => saveRename(diagram.id, name)}
                onRequestDelete={() => {
                  setActionError(null);
                  setDeleteError(null);
                  setDiagramPendingDeletion(diagram);
                }}
              />
            ))}
          </div>
        )}

        {actionError && (
          <p className={styles.actionError} role='alert'>
            {actionError}
          </p>
        )}
      </section>

      {diagramPendingDeletion && (
        <DeleteDiagramModal
          diagramName={diagramPendingDeletion.name}
          error={deleteError}
          isDeleting={isDeleting}
          onCancel={cancelDelete}
          onConfirm={() => void confirmDelete()}
        />
      )}
    </main>
  );
}

type DiagramCardProps = {
  diagram: DiagramSummary;
  onOpen: () => void;
  onRename: (name: string) => Promise<void>;
  onRequestDelete: () => void;
};

function DiagramCard({ diagram, onOpen, onRename, onRequestDelete }: DiagramCardProps) {
  const rename = useInlineDiagramRename({ diagramName: diagram.name, onRename });

  return (
    <article className={styles.card}>
      {/* biome-ignore lint/a11y/useSemanticElements: os nodes reais do React Flow incluem controles interativos internos. */}
      <div
        className={styles.cardOpen}
        onClick={onOpen}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') onOpen();
        }}
        role='button'
        tabIndex={0}
      >
        <DiagramPreview diagram={diagram} />
      </div>
      <div className={styles.cardNameSlot}>
        {rename.isEditing ? (
          <input
            ref={rename.inputRef}
            aria-label='Nome do diagrama'
            className={styles.cardNameInput}
            value={rename.nameDraft}
            onBlur={rename.handleBlur}
            onChange={(event) => rename.setNameDraft(event.target.value)}
            onClick={(event) => event.stopPropagation()}
            onKeyDown={rename.handleKeyDown}
          />
        ) : (
          <button
            className={styles.cardName}
            onClick={(event) => {
              event.stopPropagation();
              rename.startEditing();
            }}
            title='Renomear diagrama'
            type='button'
          >
            {diagram.name}
          </button>
        )}
      </div>
      <small className={styles.cardUpdatedAt}>{formatUpdatedAt(diagram.updatedAt)}</small>
      <button
        aria-label='Excluir diagrama'
        className={styles.deleteButton}
        onClick={(event) => {
          event.stopPropagation();
          onRequestDelete();
        }}
        title='Excluir diagrama'
        type='button'
      >
        <FiTrash2 aria-hidden='true' />
      </button>
    </article>
  );
}

function DiagramPreview({ diagram }: { diagram: DiagramSummary }) {
  const snapshot = selectPreviewSnapshot(diagram.content);
  const { nodes, edges } = useMemo(() => previewFlowElements(snapshot), [snapshot]);
  if (nodes.length === 0) return <span className={styles.previewEmpty}>Diagrama vazio</span>;
  const isConceptual = snapshot?.modelType === 'conceptual';

  return (
    <div className={styles.preview} aria-hidden='true'>
      <ReactFlowProvider>
        <ReactFlow
          edges={edges}
          edgeTypes={isConceptual ? conceptualEdgeTypes : logicalEdgeTypes}
          elementsSelectable={false}
          connectionMode={PREVIEW_CONNECTION_MODE}
          minZoom={PREVIEW_MIN_ZOOM}
          nodes={nodes}
          nodeTypes={isConceptual ? conceptualNodeTypes : logicalNodeTypes}
          nodesConnectable={false}
          nodesDraggable={false}
          panOnDrag={false}
          panOnScroll={false}
          proOptions={{ hideAttribution: true }}
          zoomOnDoubleClick={false}
          zoomOnPinch={false}
          zoomOnScroll={false}
        >
          <PreviewViewport nodeCount={nodes.length} />
        </ReactFlow>
      </ReactFlowProvider>
    </div>
  );
}

export function previewFlowElements(snapshot: DiagramAiProject | undefined): { nodes: Node[]; edges: Edge[] } {
  if (!snapshot) return { nodes: [], edges: [] };
  const nodes = snapshot.visual.nodes as Node[];
  const edges = snapshot.visual.edges as Edge[];
  if (snapshot.modelType !== 'conceptual') return withoutPreviewSelection(nodes, edges);

  const state = (snapshot.visual.state ?? {}) as {
    entityPositions?: Record<string, { x: number; y: number }>;
    elementPositions?: Record<string, { x: number; y: number }>;
    nodeSizes?: Record<string, { width: number; height: number }>;
    edgeControlPoints?: Record<
      string,
      { controlPoint1: { x: number; y: number }; controlPoint2: { x: number; y: number } }
    >;
  };
  const model = snapshot.semanticModel as ConceptualModel;
  const previewNodes = nodes.length > 0 ? nodes : buildFlowNodes(model, state, {});
  const previewEdges = edges.length > 0 ? edges : buildFlowEdges(model, state, {});

  return withoutPreviewSelection(previewNodes, previewEdges);
}

/**
 * A preview é somente leitura: não deve refletir a seleção transitória salva
 * pelo React Flow nem os controles associados a ela no canvas original.
 */
function withoutPreviewSelection(nodes: Node[], edges: Edge[]) {
  return {
    // Os nodes visuais já foram criados pelo mesmo mapper no editor e foram
    // persistidos com posições, dimensões e dados compatíveis com seus renderizadores.
    // Recriá-los aqui substituía esse estado visual e causou a regressão da preview.
    nodes: nodes.map((node) => {
      const { selected: _nodeSelected, ...previewNode } = node;
      const {
        isSelected: _isSelected,
        selected: _dataSelected,
        editingTableId: _editingTableId,
        highlightedColumnIds,
        ...data
      } = node.data;

      return {
        ...previewNode,
        data: {
          ...data,
          ...(Array.isArray(highlightedColumnIds) ? { highlightedColumnIds: [] } : {}),
        },
      };
    }),
    // As edges visuais preservam handles, âncoras e pontos de controle
    // definidos no canvas. A reconstrução é apenas compatibilidade para
    // documentos conceituais antigos que não tenham edges serializadas.
    edges: edges.map(({ selected: _selected, ...edge }) => edge),
  };
}

export function selectPreviewSnapshot(document: DiagramAiDocument): DiagramAiProject | undefined {
  return document.models[document.lastSavedMode] ?? document.models.conceptual ?? document.models.logical;
}

/** Enquadra a miniatura somente após o React Flow medir todos os nodes montados. */
function PreviewViewport({ nodeCount }: { nodeCount: number }) {
  const nodesInitialized = useNodesInitialized({ includeHiddenNodes: true });
  const width = useStore((state) => state.width);
  const height = useStore((state) => state.height);
  const { getNodes, getNodesBounds, setViewport, viewportInitialized } = useReactFlow();

  useLayoutEffect(() => {
    if (!nodesInitialized || !viewportInitialized || width <= 0 || height <= 0) return;

    const nodes = getNodes();
    if (nodes.length !== nodeCount || nodes.length === 0) return;

    const bounds = getNodesBounds(nodes);
    const viewport = previewViewportForBounds(bounds, width, height);
    void setViewport(viewport, { duration: 0 });
  }, [getNodes, getNodesBounds, height, nodeCount, nodesInitialized, setViewport, viewportInitialized, width]);

  return null;
}

export function previewViewportForBounds(
  bounds: { x: number; y: number; width: number; height: number },
  width: number,
  height: number,
) {
  return getViewportForBounds(bounds, width, height, PREVIEW_MIN_ZOOM, PREVIEW_MAX_ZOOM, PREVIEW_PADDING);
}

type DeleteDiagramModalProps = {
  diagramName: string;
  error: string | null;
  isDeleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

function DeleteDiagramModal({ diagramName, error, isDeleting, onCancel, onConfirm }: DeleteDiagramModalProps) {
  return (
    <div
      aria-modal='true'
      className={styles.deleteOverlay}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
      role='dialog'
      aria-labelledby='delete-diagram-title'
    >
      <div className={styles.deleteModal}>
        <span className={styles.deleteModalIcon}>
          <FiAlertTriangle aria-hidden='true' />
        </span>
        <h2 id='delete-diagram-title'>Excluir diagrama</h2>
        <p>Tem certeza que deseja excluir “{diagramName}”?</p>
        <p className={styles.deleteModalHelper}>Esta ação não poderá ser desfeita.</p>
        {error && (
          <p className={styles.deleteModalError} role='alert'>
            {error}
          </p>
        )}
        <div className={styles.deleteModalActions}>
          <button disabled={isDeleting} onClick={onCancel} type='button'>
            Cancelar
          </button>
          <button className={styles.deleteConfirmButton} disabled={isDeleting} onClick={onConfirm} type='button'>
            {isDeleting ? 'Excluindo...' : 'Excluir'}
          </button>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ onNewDiagram }: Pick<MyDiagramsPageProps, 'onNewDiagram'>) {
  return (
    <div className={styles.emptyState}>
      <span className={styles.emptyIcon}>
        <FiFileText aria-hidden='true' />
      </span>
      <h2>Você ainda não possui diagramas.</h2>
      <p>Crie seu primeiro diagrama para começar.</p>
      <button className={styles.newDiagramButton} onClick={onNewDiagram} type='button'>
        <FiPlus aria-hidden='true' />
        Novo diagrama
      </button>
    </div>
  );
}

function formatUpdatedAt(value: string) {
  const differenceInMinutes = Math.round((Date.now() - new Date(value).getTime()) / 60_000);
  if (differenceInMinutes < 1) return 'Atualizado agora';
  if (differenceInMinutes < 60) return `Atualizado há ${differenceInMinutes} min`;

  const differenceInHours = Math.round(differenceInMinutes / 60);
  if (differenceInHours < 24) return `Atualizado há ${differenceInHours} h`;

  const differenceInDays = Math.round(differenceInHours / 24);
  if (differenceInDays < 7) return `Atualizado há ${differenceInDays} dia${differenceInDays === 1 ? '' : 's'}`;

  return `Atualizado em ${new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium' }).format(new Date(value))}`;
}

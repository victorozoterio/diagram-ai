import type { Edge, Node } from '@xyflow/react';
import { describe, expect, it } from 'vitest';

import {
  createDiagramAiDocument,
  createDiagramAiProject,
  type DiagramAiProject,
  hydrateFlowEdges,
  parseDiagramAiDocument,
} from './diagram-ai-project';

const flowNodes: Node[] = [
  { id: 'cliente', position: { x: 40, y: 80 }, data: {} },
  { id: 'relationship:solicita', position: { x: 260, y: 80 }, data: {} },
];
const flowEdges: Edge[] = [
  {
    id: 'solicita:cliente',
    source: 'cliente',
    sourceHandle: 'entity-right',
    target: 'relationship:solicita',
    targetHandle: 'target-left',
    type: 'relationship',
    data: { persisted: true },
  },
];

const conceptual = createDiagramAiProject({
  modelType: 'conceptual',
  semanticModel: { metadata: {}, entities: [], relationships: [], ambiguities: [] },
  nodes: [],
  edges: [],
  viewport: { x: 12, y: 24, zoom: 0.8 },
});
const logical = createDiagramAiProject({
  modelType: 'logical',
  semanticModel: { tables: [] },
  nodes: [],
  edges: [],
  viewport: { x: -8, y: 16, zoom: 1.2 },
});

describe('documento Diagram.AI', () => {
  it('preserva nodes e edges ao serializar e desserializar um projeto conceitual', () => {
    const project = createDiagramAiProject({
      modelType: 'conceptual',
      semanticModel: { metadata: {}, entities: [], relationships: [], ambiguities: [] },
      nodes: flowNodes,
      edges: flowEdges,
    });

    const parsed = parseDiagramAiDocument(createDiagramAiDocument({ conceptual: project }, 'conceptual'));

    expect(parsed.models.conceptual?.visual.nodes).toMatchObject(flowNodes);
    expect(parsed.models.conceptual?.visual.edges).toMatchObject(flowEdges);
  });

  it('restaura a topologia persistida sem perder handles e mantém dados de runtime da edge', () => {
    const generatedEdge: Edge = {
      ...flowEdges[0],
      sourceHandle: 'runtime-source',
      targetHandle: 'runtime-target',
      data: { onCycleRelationshipCardinality: () => undefined },
    };
    const restored = hydrateFlowEdges(
      [generatedEdge],
      [
        {
          id: flowEdges[0].id,
          source: flowEdges[0].source,
          target: flowEdges[0].target,
          sourceHandle: flowEdges[0].sourceHandle,
          targetHandle: flowEdges[0].targetHandle,
          type: flowEdges[0].type,
          data: { persisted: true },
        },
      ],
    );

    expect(restored[0]).toMatchObject({
      id: flowEdges[0].id,
      source: 'cliente',
      target: 'relationship:solicita',
      sourceHandle: 'entity-right',
      targetHandle: 'target-left',
    });
    expect(restored[0].data).toMatchObject({ persisted: true });
    expect(restored[0].data).toHaveProperty('onCycleRelationshipCardinality');
  });

  it('preserva modelos conceitual e lógico com viewports independentes', () => {
    const document = createDiagramAiDocument({ conceptual, logical }, 'logical');
    const parsed = parseDiagramAiDocument(document);

    expect(parsed.lastSavedMode).toBe('logical');
    expect(parsed.models.conceptual?.visual.viewport).toEqual(conceptual.visual.viewport);
    expect(parsed.models.logical?.visual.viewport).toEqual(logical.visual.viewport);
  });

  it('aceita projetos v1 e os promove para um documento com um único modelo', () => {
    const parsed = parseDiagramAiDocument(conceptual);

    expect(parsed.lastSavedMode).toBe('conceptual');
    expect(parsed.models.conceptual).toEqual(conceptual);
    expect(parsed.models.logical).toBeUndefined();
  });

  it('mantém o outro modelo ao salvar uma atualização de um modo', () => {
    const saved = createDiagramAiDocument({ conceptual, logical }, 'conceptual');
    const updatedConceptual: DiagramAiProject = {
      ...conceptual,
      visual: { ...conceptual.visual, viewport: { x: 0, y: 0, zoom: 1 } },
    };
    const next = createDiagramAiDocument({ ...saved.models, conceptual: updatedConceptual }, 'conceptual');

    expect(next.models.logical).toEqual(logical);
    expect(next.models.conceptual?.visual.viewport).toEqual({ x: 0, y: 0, zoom: 1 });
  });

  it('usa o mesmo documento completo para um autosave ou salvamento manual', () => {
    const project = createDiagramAiProject({
      modelType: 'conceptual',
      semanticModel: { metadata: {}, entities: [], relationships: [], ambiguities: [] },
      nodes: flowNodes,
      edges: flowEdges,
    });

    const autosaveDocument = createDiagramAiDocument({ conceptual: project }, 'conceptual');
    const manualSaveDocument = createDiagramAiDocument({ conceptual: project }, 'conceptual');

    expect(autosaveDocument.models.conceptual?.visual.edges).toEqual(
      manualSaveDocument.models.conceptual?.visual.edges,
    );
  });

  it('mantém as edges de ambos os modelos após salvar e reabrir o documento', () => {
    const conceptualWithEdges = createDiagramAiProject({
      modelType: 'conceptual',
      semanticModel: { metadata: {}, entities: [], relationships: [], ambiguities: [] },
      nodes: flowNodes,
      edges: flowEdges,
    });
    const logicalWithEdges = createDiagramAiProject({
      modelType: 'logical',
      semanticModel: { tables: [] },
      nodes: flowNodes,
      edges: [
        {
          ...flowEdges[0],
          id: 'fk:pedido:cliente',
          type: 'logicalOrthogonal',
        },
      ],
    });

    const reopened = parseDiagramAiDocument(
      createDiagramAiDocument({ conceptual: conceptualWithEdges, logical: logicalWithEdges }, 'logical'),
    );

    expect(reopened.models.conceptual?.visual.edges).toHaveLength(1);
    expect(reopened.models.logical?.visual.edges).toHaveLength(1);
  });
});

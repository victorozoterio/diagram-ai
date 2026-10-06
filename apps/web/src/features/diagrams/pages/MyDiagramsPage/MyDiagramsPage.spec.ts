import { ConnectionMode, type Edge, type Node } from '@xyflow/react';
import { expect, it } from 'vitest';
import { conceptualEdgeTypes, conceptualNodeTypes } from '../../components/ConceptualDiagramFlow/flow-renderers';
import { logicalEdgeTypes, logicalNodeTypes } from '../../components/LogicalModelFlow/LogicalModelFlow';
import { createDiagramAiDocument, createDiagramAiProject } from '../../types';
import {
  PREVIEW_CONNECTION_MODE,
  previewFlowElements,
  previewViewportForBounds,
  selectPreviewSnapshot,
} from './MyDiagramsPage';

const conceptual = createDiagramAiProject({
  modelType: 'conceptual',
  semanticModel: { metadata: {}, entities: [], relationships: [], ambiguities: [] },
  nodes: [],
  edges: [],
});
const logical = createDiagramAiProject({ modelType: 'logical', semanticModel: { tables: [] }, nodes: [], edges: [] });

it('seleciona o snapshot do último modo salvo para a preview', () => {
  expect(selectPreviewSnapshot(createDiagramAiDocument({ conceptual, logical }, 'conceptual'))).toBe(conceptual);
  expect(selectPreviewSnapshot(createDiagramAiDocument({ conceptual, logical }, 'logical'))).toBe(logical);
});

it('reutiliza os mesmos renderizadores do canvas principal', () => {
  expect(conceptualNodeTypes).toHaveProperty('entity');
  expect(conceptualNodeTypes).toHaveProperty('attribute');
  expect(conceptualNodeTypes).toHaveProperty('relationship');
  expect(conceptualEdgeTypes).toHaveProperty('relationship');
  expect(logicalNodeTypes).toHaveProperty('table');
  expect(logicalEdgeTypes).toHaveProperty('logicalOrthogonal');
  expect(PREVIEW_CONNECTION_MODE).toBe(ConnectionMode.Loose);
});

it('reconstrói nodes e edges conceituais para a preview preservando handles e cardinalidades', () => {
  const persistedNodes: Node[] = [
    { id: 'origem', type: 'entity', position: { x: 0, y: 0 }, width: 170, height: 64, data: { name: 'origem' } },
    { id: 'destino', type: 'entity', position: { x: 500, y: 0 }, width: 170, height: 64, data: { name: 'destino' } },
    {
      id: 'origem:nome',
      type: 'attribute',
      position: { x: 0, y: 150 },
      width: 150,
      height: 62,
      data: { name: 'nome' },
    },
    {
      id: 'relationship:rel',
      type: 'relationship',
      position: { x: 250, y: 0 },
      width: 102,
      height: 86,
      data: { name: 'associa' },
    },
  ];
  const persistedEdges: Edge[] = [
    {
      id: 'attribute:origem:nome',
      source: 'origem',
      sourceHandle: 'entity-bottom',
      target: 'origem:nome',
      targetHandle: 'attribute-top',
      type: 'attribute',
      data: {
        sourceAnchor: { xRatio: 0.5, yRatio: 1 },
        targetAnchor: { xRatio: 0.5, yRatio: 0 },
      },
    },
    {
      id: 'rel:origem',
      source: 'origem',
      sourceHandle: 'entity-right',
      target: 'relationship:rel',
      targetHandle: 'target-left',
      type: 'relationship',
      data: { relationship: { id: 'rel', participants: [{ entityId: 'origem', cardinality: '1' }] } },
    },
    {
      id: 'rel:destino',
      source: 'relationship:rel',
      sourceHandle: 'source-right',
      target: 'destino',
      targetHandle: 'entity-left',
      type: 'relationship',
      data: {
        relationship: {
          id: 'rel',
          participants: [
            { entityId: 'origem', cardinality: '1' },
            { entityId: 'destino', cardinality: 'N' },
          ],
        },
      },
    },
  ];
  const model = createDiagramAiProject({
    modelType: 'conceptual',
    semanticModel: {
      metadata: {},
      entities: [
        {
          id: 'origem',
          name: 'origem',
          attributes: [
            {
              id: 'nome',
              name: 'nome',
              type: 'string',
              identifier: false,
              required: false,
              unique: false,
              multivalued: false,
              composite: false,
              derived: false,
              components: [],
            },
          ],
        },
        { id: 'destino', name: 'destino', attributes: [] },
      ],
      relationships: [
        {
          id: 'rel',
          name: 'associa',
          type: '1:N',
          participants: [
            { entityId: 'origem', cardinality: '1' },
            { entityId: 'destino', cardinality: 'N' },
          ],
          attributes: [],
        },
      ],
      ambiguities: [],
    },
    nodes: persistedNodes,
    edges: persistedEdges,
    visualState: {
      entityPositions: { origem: { x: 0, y: 0 }, destino: { x: 500, y: 0 } },
      elementPositions: { 'origem:nome': { x: 0, y: 150 }, 'relationship:rel': { x: 250, y: 0 } },
    },
  });

  const preview = previewFlowElements(model);
  // A preview deve montar antes do fitView usando exatamente o estado visual
  // e as conexões que foram salvos pelo editor, sem recriar os elementos.
  expect(preview.nodes).toEqual(persistedNodes);
  expect(preview.edges).toEqual(persistedEdges);
  expect(preview.edges).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ sourceHandle: 'entity-right', targetHandle: 'target-left' }),
      expect.objectContaining({ sourceHandle: 'source-right', targetHandle: 'entity-left' }),
      expect.objectContaining({
        data: expect.objectContaining({
          relationship: expect.objectContaining({
            participants: expect.arrayContaining([
              expect.objectContaining({ entityId: 'origem', cardinality: '1' }),
              expect.objectContaining({ entityId: 'destino', cardinality: 'N' }),
            ]),
          }),
        }),
      }),
    ]),
  );
});

it('reconstrói edges conceituais apenas para documentos legados sem edges visualmente salvas', () => {
  const legacyPreview = previewFlowElements(
    createDiagramAiProject({
      modelType: 'conceptual',
      semanticModel: {
        metadata: {},
        entities: [
          { id: 'a', name: 'A', attributes: [] },
          { id: 'b', name: 'B', attributes: [] },
        ],
        relationships: [
          {
            id: 'rel',
            name: 'relaciona',
            type: '1:N',
            participants: [
              { entityId: 'a', cardinality: '1' },
              { entityId: 'b', cardinality: 'N' },
            ],
            attributes: [],
          },
        ],
        ambiguities: [],
      },
      nodes: [],
      edges: [],
      visualState: { entityPositions: { a: { x: 0, y: 0 }, b: { x: 600, y: 0 } } },
    }),
  );

  expect(legacyPreview.nodes).toHaveLength(3);
  expect(legacyPreview.edges).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ source: 'a', target: 'relationship:rel' }),
      expect.objectContaining({ source: 'relationship:rel', target: 'b' }),
    ]),
  );
});

it('preserva tabelas e conexões lógicas serializadas', () => {
  const nodes: Node[] = [
    { id: 'cliente', type: 'table', position: { x: 0, y: 0 }, width: 220, height: 150, data: {} },
    { id: 'pedido', type: 'table', position: { x: 600, y: 280 }, width: 220, height: 150, data: {} },
  ];
  const edges: Edge[] = [
    {
      id: 'fk:pedido:cliente',
      source: 'pedido',
      sourceHandle: 'field:cliente_id:right',
      target: 'cliente',
      targetHandle: 'field:id_cliente:left',
      type: 'logicalOrthogonal',
      data: { routeOffset: 24 },
    },
  ];
  const preview = previewFlowElements(
    createDiagramAiProject({
      modelType: 'logical',
      semanticModel: { tables: [] },
      nodes,
      edges,
    }),
  );

  expect(preview.nodes).toEqual(nodes);
  expect(preview.edges).toEqual(edges);
});

it('considera a preview vazia somente quando não há snapshot', () => {
  expect(previewFlowElements(undefined)).toEqual({ nodes: [], edges: [] });
});

it('enquadra todos os nodes distantes dentro da área real da miniatura', () => {
  const bounds = { x: -700, y: -300, width: 3800, height: 1800 };
  const width = 260;
  const height = 132;
  const viewport = previewViewportForBounds(bounds, width, height);

  expect(viewport.zoom).toBeLessThan(0.5);
  expect(bounds.x * viewport.zoom + viewport.x).toBeGreaterThan(0);
  expect(bounds.y * viewport.zoom + viewport.y).toBeGreaterThan(0);
  expect((bounds.x + bounds.width) * viewport.zoom + viewport.x).toBeLessThan(width);
  expect((bounds.y + bounds.height) * viewport.zoom + viewport.y).toBeLessThan(height);
});

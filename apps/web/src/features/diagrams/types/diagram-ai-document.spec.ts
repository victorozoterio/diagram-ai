import { describe, expect, it } from 'vitest';

import {
  createDiagramAiDocument,
  createDiagramAiProject,
  type DiagramAiProject,
  parseDiagramAiDocument,
} from './diagram-ai-project';

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
});

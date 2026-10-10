import { expect, it } from 'vitest';

import type { DiagramAiProject } from '../../types';
import { EMPTY_MODE_VIEWPORTS, viewportForProjectBounds, withModeViewport } from './mode-viewports';

const conceptualViewport = { x: 120, y: -80, zoom: 0.72 };
const logicalViewport = { x: -250, y: 160, zoom: 1.15 };

it('restaura o viewport conceitual após Conceitual → Lógico → Conceitual', () => {
  const afterConceptual = withModeViewport(EMPTY_MODE_VIEWPORTS, 'conceptual', conceptualViewport);
  const afterLogical = withModeViewport(afterConceptual, 'logical', logicalViewport);

  expect(afterLogical.conceptual).toEqual(conceptualViewport);
  expect(afterLogical.logical).toEqual(logicalViewport);
});

it('restaura o viewport lógico após Lógico → Conceitual → Lógico', () => {
  const afterLogical = withModeViewport(EMPTY_MODE_VIEWPORTS, 'logical', logicalViewport);
  const afterConceptual = withModeViewport(afterLogical, 'conceptual', conceptualViewport);

  expect(afterConceptual.conceptual).toEqual(conceptualViewport);
  expect(afterConceptual.logical).toEqual(logicalViewport);
});

it('limpa somente o viewport do modelo que recebeu um modelo novo', () => {
  const current = withModeViewport(
    withModeViewport(EMPTY_MODE_VIEWPORTS, 'conceptual', conceptualViewport),
    'logical',
    logicalViewport,
  );
  const afterNewLogicalModel = withModeViewport(current, 'logical', null);

  expect(afterNewLogicalModel.conceptual).toEqual(conceptualViewport);
  expect(afterNewLogicalModel.logical).toBeNull();
});

it('calcula viewports iniciais independentes a partir dos nodes de cada modelo salvo', () => {
  const conceptual = projectWithNode('conceptual', { x: 100, y: 80 }, 220, 120);
  const logical = projectWithNode('logical', { x: 900, y: 620 }, 480, 260);
  const viewportSize = { width: 960, height: 620 };

  const conceptualViewport = viewportForProjectBounds(conceptual, viewportSize);
  const logicalViewport = viewportForProjectBounds(logical, viewportSize);

  expect(conceptualViewport).not.toEqual(logicalViewport);
  expect(conceptualViewport.zoom).toBeGreaterThan(0);
  expect(logicalViewport.zoom).toBeGreaterThan(0);
});

it('usa o viewport padrão quando o modelo salvo não possui nodes', () => {
  const project: DiagramAiProject = {
    format: 'diagram-ai',
    version: 1,
    exportedAt: new Date().toISOString(),
    modelType: 'logical',
    semanticModel: { tables: [] },
    visual: { nodes: [], edges: [], viewport: { x: 140, y: 90, zoom: 0.5 } },
  };

  expect(viewportForProjectBounds(project, { width: 960, height: 620 })).toEqual({ x: 0, y: 0, zoom: 1 });
});

function projectWithNode(
  modelType: DiagramAiProject['modelType'],
  position: { x: number; y: number },
  width: number,
  height: number,
): DiagramAiProject {
  return {
    format: 'diagram-ai',
    version: 1,
    exportedAt: new Date().toISOString(),
    modelType,
    semanticModel:
      modelType === 'conceptual' ? { metadata: {}, entities: [], relationships: [], ambiguities: [] } : { tables: [] },
    visual: {
      nodes: [{ id: `${modelType}-node`, position, width, height }],
      edges: [],
      viewport: { x: 320, y: -150, zoom: 0.4 },
    },
  };
}

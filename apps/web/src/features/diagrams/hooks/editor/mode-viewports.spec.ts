import { expect, it } from 'vitest';

import { EMPTY_MODE_VIEWPORTS, withModeViewport } from './mode-viewports';

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

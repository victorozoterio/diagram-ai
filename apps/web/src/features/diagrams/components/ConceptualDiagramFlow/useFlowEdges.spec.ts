import { describe, expect, it } from 'vitest';

import { type DiagramAiFlowEdge, hydrateFlowEdges } from '../../types';

describe('hidratação das edges conceituais', () => {
  it('preserva uma edge persistida quando o canvas é reaberto', () => {
    const persistedEdge: DiagramAiFlowEdge = {
      id: 'relacionamento:cliente',
      source: 'cliente',
      sourceHandle: 'entity-right',
      target: 'relationship:solicita',
      targetHandle: 'target-left',
      type: 'relationship',
      data: { persisted: true },
    };

    expect(hydrateFlowEdges([], [persistedEdge])).toMatchObject([persistedEdge]);
  });
});

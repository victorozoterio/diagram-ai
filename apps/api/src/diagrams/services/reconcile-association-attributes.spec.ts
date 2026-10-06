import { expect, it } from 'vitest';

import type { ConceptualModel } from '../schemas/conceptual-model.schema';
import { reconcileAssociationAttributes } from './reconcile-association-attributes';

const date = {
  id: 'data_da_associacao',
  name: 'data_da_associacao',
  type: 'date' as const,
  identifier: false,
  required: false,
  unique: false,
  multivalued: false,
  composite: false,
  derived: false,
  components: [],
};

function model(sourceText: string, secondaryName: string): ConceptualModel {
  return {
    metadata: { generatedBy: 'ollama', sourceText },
    entities: [
      { id: 'a', name: 'a', attributes: [] },
      { id: 'b', name: 'b', attributes: [] },
    ],
    standaloneAttributes: [],
    ambiguities: [],
    relationships: [
      {
        id: 'associa',
        name: 'associa',
        type: 'N:N',
        kind: 'relationship',
        participants: [
          { entityId: 'a', cardinality: 'N' },
          { entityId: 'b', cardinality: 'N' },
        ],
        attributes: [],
        subtypeIds: [],
        subtypeHandles: {},
      },
      {
        id: 'extra',
        name: secondaryName,
        type: '1:1',
        kind: 'relationship',
        participants: [
          { entityId: 'b', cardinality: '1' },
          { entityId: 'a', cardinality: '1' },
        ],
        attributes: [date],
        subtypeIds: [],
        subtypeHandles: {},
      },
    ],
  };
}

it('move o dado da associação da relação artificial para a relação existente', () => {
  const result = reconcileAssociationAttributes(
    model('A participa de B. Para cada participação de A em B, registre a data da associação.', 'data_participacao'),
  );
  expect(result.relationships).toHaveLength(1);
  expect(result.relationships[0]).toMatchObject({ id: 'associa', attributes: [date] });
});

it('preserva relações distintas explicitamente descritas entre os mesmos participantes', () => {
  const original = model('A associa B. A também registra data participacao de B.', 'data_participacao');
  expect(reconcileAssociationAttributes(original)).toBe(original);
});

it('não mescla relações apenas porque compartilham os mesmos participantes', () => {
  const original = model('A associa B. A revisa B.', 'revisa');
  expect(reconcileAssociationAttributes(original)).toBe(original);
});

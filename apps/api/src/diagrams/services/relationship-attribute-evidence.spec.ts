import { expect, it } from 'vitest';

import type { ConceptualModel } from '../schemas/conceptual-model.schema';
import { unsupportedRelationshipAttributes } from './relationship-attribute-evidence';

function model(): ConceptualModel {
  const attribute = (name: string) => ({
    id: name,
    name,
    type: 'date' as const,
    identifier: false,
    required: false,
    unique: false,
    multivalued: false,
    composite: false,
    derived: false,
    components: [],
  });

  return {
    metadata: {
      generatedBy: 'ollama',
      sourceText:
        'Pessoas participam de atividades. Pessoas trabalham em grupos. Para cada participação de uma pessoa em uma atividade, registre a data em que começou.',
    },
    entities: [
      { id: 'pessoa', name: 'pessoa', attributes: [] },
      { id: 'atividade', name: 'atividade', attributes: [] },
      { id: 'grupo', name: 'grupo', attributes: [] },
    ],
    standaloneAttributes: [],
    ambiguities: [],
    relationships: [
      {
        id: 'participa',
        name: 'participa',
        kind: 'relationship',
        type: 'N:N',
        participants: [
          { entityId: 'pessoa', cardinality: 'N' },
          { entityId: 'atividade', cardinality: 'N' },
        ],
        attributes: [attribute('data_participacao')],
        subtypeIds: [],
        subtypeHandles: {},
      },
      {
        id: 'trabalha',
        name: 'trabalha',
        kind: 'relationship',
        type: '1:N',
        participants: [
          { entityId: 'pessoa', cardinality: 'N' },
          { entityId: 'grupo', cardinality: '1' },
        ],
        attributes: [attribute('data_inicio')],
        subtypeIds: [],
        subtypeHandles: {},
      },
    ],
  };
}

it('mantém o atributo na associação citada e identifica a cópia em outra relação', () => {
  expect(unsupportedRelationshipAttributes(model())).toEqual([
    {
      relationship: 'trabalha',
      attribute: 'data_inicio',
      participants: ['pessoa', 'grupo'],
      rule: 'Atributos de relacionamento gerados pela IA precisam estar vinculados a essa associação na descrição.',
    },
  ]);
});

it('não impõe evidência da descrição a modelos editados manualmente', () => {
  const edited = model();
  edited.metadata.generatedBy = undefined;
  expect(unsupportedRelationshipAttributes(edited)).toEqual([]);
});

it('considera um esclarecimento que atribui explicitamente o dado à associação', () => {
  const generated = model();
  generated.metadata.sourceText = 'Pessoas trabalham em grupos.';
  generated.relationships[0].attributes = [];

  expect(
    unsupportedRelationshipAttributes(generated, [
      {
        questionId: 'atributo_trabalho',
        answers: ['Para cada trabalho de uma pessoa em um grupo, registre a data de início.'],
      },
    ]),
  ).toEqual([]);
});

it('reconhece o dado da ocorrência quando o requisito o informa na frase seguinte', () => {
  const generated = model();
  generated.metadata.sourceText =
    'Pessoas participam de atividades. Para cada ocorrência dessa associação, registre a data da participação.';
  generated.relationships[1].attributes = [];

  expect(unsupportedRelationshipAttributes(generated)).toEqual([]);
});

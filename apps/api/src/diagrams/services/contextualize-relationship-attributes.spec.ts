import { expect, it } from 'vitest';
import type { ConceptualModel } from '../schemas/conceptual-model.schema';
import { contextualizeRelationshipAttributes } from './contextualize-relationship-attributes';

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

it.each([
  ['colaboração', 'data_inicio_colaboracao'],
  ['participação', 'data_inicio_participacao'],
] as const)('mantém o dado na associação e diferencia seu nome pelo contexto de %s', (association, expected) => {
  const model: ConceptualModel = {
    metadata: {
      generatedBy: 'ollama',
      sourceText: `Cada tarefa possui data de início. Pessoas colaboram em tarefas. Para cada ${association} de uma pessoa em uma tarefa, registrar a data em que começou.`,
    },
    entities: [
      { id: 'pessoa', name: 'pessoa', attributes: [] },
      { id: 'tarefa', name: 'tarefa', attributes: [attribute('data_inicio')] },
    ],
    relationships: [
      {
        id: 'colabora',
        name: 'colabora',
        kind: 'relationship',
        type: 'N:N',
        participants: [
          { entityId: 'pessoa', cardinality: 'N' },
          { entityId: 'tarefa', cardinality: 'N' },
        ],
        attributes: [attribute('data_inicio')],
        subtypeIds: [],
        subtypeHandles: {},
      },
    ],
    standaloneAttributes: [],
    ambiguities: [],
  };

  const result = contextualizeRelationshipAttributes(model);
  expect(result.entities[1].attributes[0].name).toBe('data_inicio');
  expect(result.relationships[0].attributes[0].name).toBe(expected);
});

import { strict as assert } from 'node:assert';
import { test } from 'node:test';

import { type ConceptualModel, ConceptualModelSchema } from './conceptual-model.schema';

function conceptualModel(sourceText?: string): ConceptualModel {
  return {
    metadata: sourceText ? { sourceText } : {},
    standaloneAttributes: [],
    ambiguities: [],
    entities: [
      {
        id: 'colaborador',
        name: 'colaborador',
        attributes: [technicalIdentifier('colaborador'), attribute('data_inicio')],
      },
      {
        id: 'atividade',
        name: 'atividade',
        attributes: [technicalIdentifier('atividade'), attribute('nome')],
      },
    ],
    relationships: [
      {
        id: 'atua_1',
        name: 'atua',
        type: 'N:N',
        kind: 'relationship',
        participants: [
          { entityId: 'colaborador', cardinality: 'N' },
          { entityId: 'atividade', cardinality: 'N' },
        ],
        attributes: [attribute('data_inicio')],
        subtypeIds: [],
        subtypeHandles: {},
      },
    ],
  };
}

function attribute(name: string) {
  return {
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
  };
}

function technicalIdentifier(entity: string) {
  return {
    ...attribute(`id_${entity}`),
    type: 'uuid' as const,
    identifier: true,
    required: true,
    unique: true,
  };
}

test('rejeita a duplicidade real de atributo entre entidade e relacionamento', () => {
  const result = ConceptualModelSchema.safeParse(conceptualModel());

  assert.equal(result.success, false);
  if (!result.success) {
    assert.ok(
      result.error.issues.some(
        (issue) =>
          issue.message === 'O mesmo atributo não deve ser duplicado em uma entidade participante e no relacionamento.',
      ),
    );
  }
});

test('preserva atributos de mesmo nome quando a descrição os vincula a ocorrências distintas', () => {
  const result = ConceptualModelSchema.safeParse(
    conceptualModel('Para cada atuação de um colaborador em uma atividade, registre a data em que o trabalho começou.'),
  );

  assert.equal(result.success, true);
});

test('mantém atributo semanticamente dependente da associação no relacionamento', () => {
  const model = conceptualModel(
    'Para cada atuação de um colaborador em uma atividade, registre a data em que o trabalho começou.',
  );
  const result = ConceptualModelSchema.safeParse(model);

  assert.equal(result.success, true);
  if (result.success) {
    assert.equal(result.data.relationships[0].attributes[0].name, 'data_inicio');
  }
});

test('rejeita Gen gerado por IA quando o texto só descreve uma associação', () => {
  const model: ConceptualModel = {
    metadata: {
      generatedBy: 'ollama',
      sourceText: 'Pessoas colaboram com iniciativas.',
    },
    standaloneAttributes: [],
    ambiguities: [],
    entities: [
      { id: 'pessoa', name: 'pessoa', attributes: [technicalIdentifier('pessoa')] },
      {
        id: 'colabora_com_iniciativa',
        name: 'colabora_com_iniciativa',
        attributes: [technicalIdentifier('colabora_com_iniciativa')],
      },
    ],
    relationships: [
      {
        id: 'gen_1',
        name: 'Gen',
        type: '1:N',
        kind: 'generalization',
        participants: [],
        attributes: [],
        supertypeId: 'pessoa',
        subtypeIds: ['colabora_com_iniciativa'],
        subtypeHandles: {},
      },
    ],
  };

  const result = ConceptualModelSchema.safeParse(model);

  assert.equal(result.success, false);
  if (!result.success) {
    assert.ok(
      result.error.issues.some(
        (issue) =>
          issue.message ===
          'Generalização exige evidência explícita de supertipo e subtipo; uma associação com cardinalidade deve ser relacionamento comum.',
      ),
    );
  }
});

test('aceita Gen gerado por IA quando há evidência explícita de classificação', () => {
  const model: ConceptualModel = {
    metadata: {
      generatedBy: 'ollama',
      sourceText: 'Documentos podem ser contratos ou faturas.',
    },
    standaloneAttributes: [],
    ambiguities: [],
    entities: [
      { id: 'documento', name: 'documento', attributes: [technicalIdentifier('documento')] },
      { id: 'contrato', name: 'contrato', attributes: [technicalIdentifier('contrato')] },
      { id: 'fatura', name: 'fatura', attributes: [technicalIdentifier('fatura')] },
    ],
    relationships: [
      {
        id: 'gen_1',
        name: 'Gen',
        type: '1:N',
        kind: 'generalization',
        participants: [],
        attributes: [],
        supertypeId: 'documento',
        subtypeIds: ['contrato', 'fatura'],
        subtypeHandles: {},
      },
    ],
  };

  assert.equal(ConceptualModelSchema.safeParse(model).success, true);
});

import { expect, it } from 'vitest';

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

it('rejeita a duplicidade real de atributo entre entidade e relacionamento', () => {
  const result = ConceptualModelSchema.safeParse(conceptualModel());

  expect(result.success).toBe(false);
  if (!result.success) {
    expect(
      result.error.issues.some(
        (issue) =>
          issue.message === 'O mesmo atributo não deve ser duplicado em uma entidade participante e no relacionamento.',
      ),
    ).toBe(true);
  }
});

it('preserva atributos de mesmo nome quando a descrição os vincula a ocorrências distintas', () => {
  const result = ConceptualModelSchema.safeParse(
    conceptualModel('Para cada atuação de um colaborador em uma atividade, registre a data em que o trabalho começou.'),
  );

  expect(result.success).toBe(true);
});

it('mantém atributo semanticamente dependente da associação no relacionamento', () => {
  const model = conceptualModel(
    'Para cada atuação de um colaborador em uma atividade, registre a data em que o trabalho começou.',
  );
  const result = ConceptualModelSchema.safeParse(model);

  expect(result.success).toBe(true);
  if (result.success) {
    expect(result.data.relationships[0].attributes[0].name).toBe('data_inicio');
  }
});

it('rejeita Gen gerado por IA quando o texto só descreve uma associação', () => {
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

  expect(result.success).toBe(false);
  if (!result.success) {
    expect(
      result.error.issues.some(
        (issue) =>
          issue.message ===
          'Generalização exige evidência explícita de supertipo e subtipo; uma associação com cardinalidade deve ser relacionamento comum.',
      ),
    ).toBe(true);
  }
});

it('aceita Gen gerado por IA quando há evidência explícita de classificação', () => {
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

  expect(ConceptualModelSchema.safeParse(model).success).toBe(true);
});

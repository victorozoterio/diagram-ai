import { expect, it } from 'vitest';

import { type Attribute, type ConceptualModel, ConceptualModelSchema } from '../schemas/conceptual-model.schema';
import { findCompositeAttributeInconsistencies, normalizeCompositeAttributes } from './normalize-composite-attributes';

function attribute(overrides: Partial<Attribute> = {}): Attribute {
  return {
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
    ...overrides,
  };
}

function model(attributes: Attribute[]): ConceptualModel {
  return {
    metadata: {},
    standaloneAttributes: [],
    ambiguities: [],
    entities: [
      {
        id: 'pessoa',
        name: 'pessoa',
        attributes: [
          attribute({
            id: 'id_pessoa',
            name: 'id_pessoa',
            type: 'uuid',
            identifier: true,
            required: true,
            unique: true,
          }),
          ...attributes,
        ],
      },
    ],
    relationships: [],
  };
}

it('mantém um atributo simples válido como simples', () => {
  const candidate = model([attribute()]);

  expect(findCompositeAttributeInconsistencies(candidate)).toEqual([]);
  expect(normalizeCompositeAttributes(candidate).entities[0].attributes[1]).toMatchObject({
    composite: false,
    components: [],
  });
  expect(ConceptualModelSchema.safeParse(candidate).success).toBe(true);
});

it('mantém um atributo composto válido com seus componentes', () => {
  const candidate = model([
    attribute({
      id: 'endereco',
      name: 'endereco',
      composite: true,
      components: [
        { id: 'endereco_rua', name: 'rua', type: 'string' },
        { id: 'endereco_numero', name: 'numero', type: 'number' },
      ],
    }),
  ]);

  expect(findCompositeAttributeInconsistencies(candidate)).toEqual([]);
  expect(ConceptualModelSchema.safeParse(candidate).success).toBe(true);
});

it('marca como composto um atributo que já possui componentes', () => {
  const candidate = model([
    attribute({
      id: 'endereco',
      name: 'endereco',
      composite: false,
      components: [{ id: 'endereco_rua', name: 'rua', type: 'string' }],
    }),
  ]);

  expect(ConceptualModelSchema.safeParse(candidate).success).toBe(false);
  const normalized = normalizeCompositeAttributes(candidate);
  expect(normalized.entities[0].attributes[1]?.composite).toBe(true);
  expect(ConceptualModelSchema.safeParse(normalized).success).toBe(true);
});

it('remove a flag composta quando a IA não forneceu nenhum componente', () => {
  const candidate = model([attribute({ id: 'apelido', name: 'apelido', composite: true })]);

  expect(findCompositeAttributeInconsistencies(candidate)).toEqual([
    expect.objectContaining({
      scope: 'entity',
      owner: 'pessoa',
      attribute: expect.objectContaining({ id: 'apelido', composite: true, components: [] }),
    }),
  ]);
  const normalized = normalizeCompositeAttributes(candidate);
  expect(normalized.entities[0].attributes[1]?.composite).toBe(false);
  expect(ConceptualModelSchema.safeParse(normalized).success).toBe(true);
});

it('não infere composição a partir do nome do atributo', () => {
  const candidate = model([attribute({ id: 'cpf_cnpj', name: 'cpf_cnpj' })]);

  const normalized = normalizeCompositeAttributes(candidate);
  expect(normalized.entities[0].attributes[1]).toMatchObject({
    name: 'cpf_cnpj',
    composite: false,
    components: [],
  });
});

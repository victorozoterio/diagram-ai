import { describe, expect, it } from 'vitest';

import type { ConceptualModel } from '../schemas/conceptual-model.schema';
import {
  normalizeConceptualModelForConversion,
  validateConceptualModelForConversion,
} from './conceptual-conversion-validation';

function model(): ConceptualModel {
  return {
    metadata: {},
    standaloneAttributes: [],
    ambiguities: [],
    entities: [
      {
        id: 'cliente',
        name: 'Cliente Especial',
        attributes: [
          {
            id: 'id_cliente_especial',
            name: 'id_cliente_especial',
            type: 'uuid',
            identifier: true,
            required: true,
            unique: true,
            multivalued: false,
            composite: false,
            derived: false,
            components: [],
          },
        ],
      },
    ],
    relationships: [],
  };
}

describe('validação para conversão conceitual → lógica', () => {
  it('aceita nomes válidos com espaços e caracteres especiais, normalizando apenas espaços externos', () => {
    const input = model();
    input.entities[0].name = '  Cliente & Especial  ';

    const normalized = normalizeConceptualModelForConversion(input) as ConceptualModel;

    expect(normalized.entities[0].name).toBe('Cliente & Especial');
    expect(validateConceptualModelForConversion(normalized)).toEqual([]);
  });

  it('identifica colisões de nomes após a normalização técnica', () => {
    const input = model();
    input.entities.push({ ...model().entities[0], id: 'cliente-2', name: 'cliente especial' });

    expect(validateConceptualModelForConversion(input)).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'entity-name-duplicate' })]),
    );
  });

  it('informa relacionamentos incompletos e referências inválidas antes da conversão', () => {
    const input = model();
    input.relationships.push({
      id: 'compra',
      name: 'compra',
      type: '1:N',
      kind: 'relationship',
      participants: [{ entityId: 'inexistente', cardinality: '1' }],
      attributes: [],
      subtypeIds: [],
      subtypeHandles: {},
    });

    const issues = validateConceptualModelForConversion(input);

    expect(issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining(['relationship-participants-invalid', 'relationship-reference-invalid']),
    );
  });
});

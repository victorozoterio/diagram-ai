import { describe, expect, it } from 'vitest';

import type { ConceptualModel, EntityKind } from '../../types';
import {
  conceptualElementIds,
  createEmptyConceptualModel,
  createManualAttribute,
  createManualEntity,
  createStandaloneRelationship,
  DEFAULT_DESCRIPTION,
  DESCRIPTION_PLACEHOLDER,
} from './model-factories';
import { addAttributeToModel, updateEntityInModel } from './model-operations';

function addManualEntity(model: ConceptualModel, kind: EntityKind = 'regular') {
  const entity = createManualEntity(kind, model.entities);
  return { entity, model: { ...model, entities: [...model.entities, entity] } };
}

describe('identidade dos elementos manuais', () => {
  it('preserva o id da entidade ao renomear e cria outra entidade sem colisão', () => {
    const initialModel = createEmptyConceptualModel();
    const first = addManualEntity(initialModel);
    const renamed = updateEntityInModel(first.model, first.entity.id, { name: 'Entidade teste' });
    const second = addManualEntity(renamed);

    expect(renamed.entities).toHaveLength(1);
    expect(renamed.entities[0]).toMatchObject({ id: first.entity.id, name: 'Entidade teste' });
    expect(second.entity.id).not.toBe(first.entity.id);
    expect(second.model.entities.map((entity) => entity.id)).toEqual([first.entity.id, second.entity.id]);
  });

  it('mantém ids distintos após renomes sucessivos de elementos do mesmo tipo', () => {
    let model = createEmptyConceptualModel();
    const createdIds = new Set<string>();

    for (let index = 0; index < 6; index += 1) {
      const result = addManualEntity(model);
      model = updateEntityInModel(result.model, result.entity.id, { name: `Nome editável ${index}` });
      createdIds.add(result.entity.id);
    }

    expect(createdIds.size).toBe(6);
    expect(model.entities).toHaveLength(6);
    expect(new Set(model.entities.map((entity) => entity.id)).size).toBe(6);
  });

  it('usa a mesma identidade independente do nome para atributos e relacionamentos manuais', () => {
    const entity = createManualEntity('regular', []);
    const model: ConceptualModel = {
      ...createEmptyConceptualModel(),
      entities: [entity],
    };
    const firstAttribute = createManualAttribute(0, 'simple-attribute', conceptualElementIds(model));
    const modelWithAttribute = addAttributeToModel(model, entity.id, { ...firstAttribute, name: 'Nome editável' });
    const secondAttribute = createManualAttribute(1, 'simple-attribute', conceptualElementIds(modelWithAttribute));
    const firstRelationship = createStandaloneRelationship('relationship', conceptualElementIds(modelWithAttribute));
    const secondRelationship = createStandaloneRelationship('relationship', [
      ...conceptualElementIds(modelWithAttribute),
      firstRelationship.id,
    ]);

    expect(secondAttribute.id).not.toBe(firstAttribute.id);
    expect(secondRelationship.id).not.toBe(firstRelationship.id);
    expect(
      new Set([entity.id, firstAttribute.id, secondAttribute.id, firstRelationship.id, secondRelationship.id]).size,
    ).toBe(5);
  });
});

describe('estado inicial do assistente', () => {
  it('inicia a descrição vazia e mantém a dica apenas como placeholder', () => {
    expect(DEFAULT_DESCRIPTION).toBe('');
    expect(DESCRIPTION_PLACEHOLDER).toBe('Descreva o sistema que deseja modelar...');
    expect(DEFAULT_DESCRIPTION).not.toContain(DESCRIPTION_PLACEHOLDER);
  });
});

import type { Attribute, ConceptualModel, ElementKind, LogicalModel } from '../../types';
import type { AttributeSelection, DiagramPosition, StateSetter } from './editor.types';
import { attributePositionKey, createManualAttribute } from './model-factories';
import { addAttributeToModel, removeAttributeFromModel, updateAttributeInModel } from './model-operations';

type AttributeActionDependencies = {
  conceptualModel: ConceptualModel | null;
  setConceptualModel: StateSetter<ConceptualModel | null>;
  setLogicalModel: StateSetter<LogicalModel | null>;
  setElementPositions: StateSetter<Record<string, DiagramPosition>>;
  setSelectedAttribute: StateSetter<AttributeSelection>;
};

export function useAttributeActions({
  conceptualModel,
  setConceptualModel,
  setLogicalModel,
  setElementPositions,
  setSelectedAttribute,
}: AttributeActionDependencies) {
  function addAttribute(entityId: string, kind: ElementKind = 'simple-attribute', position?: DiagramPosition) {
    const entity = conceptualModel?.entities.find((currentEntity) => currentEntity.id === entityId);
    if (!entity) {
      return;
    }

    const attribute = createManualAttribute(entityId, entity.attributes.length, kind);
    setConceptualModel((currentModel) =>
      currentModel ? addAttributeToModel(currentModel, entityId, attribute) : currentModel,
    );
    if (position) {
      setElementPositions((currentPositions) => ({
        ...currentPositions,
        [attributePositionKey(entityId, attribute.id)]: position,
      }));
    }
    setLogicalModel(null);
  }

  function selectAttribute(entityId: string, attributeId: string) {
    setSelectedAttribute((currentSelection) =>
      currentSelection?.entityId === entityId && currentSelection.attributeId === attributeId
        ? null
        : { entityId, attributeId },
    );
  }

  function updateAttribute(entityId: string, attributeId: string, changes: Partial<Attribute>) {
    setConceptualModel((currentModel) =>
      currentModel ? updateAttributeInModel(currentModel, entityId, attributeId, changes) : currentModel,
    );
    setLogicalModel(null);
  }

  function removeAttribute(entityId: string, attributeId: string) {
    setConceptualModel((currentModel) =>
      currentModel ? removeAttributeFromModel(currentModel, entityId, attributeId) : currentModel,
    );
    setSelectedAttribute((currentSelection) =>
      currentSelection?.entityId === entityId && currentSelection.attributeId === attributeId ? null : currentSelection,
    );
    setElementPositions(({ [attributePositionKey(entityId, attributeId)]: _removed, ...remaining }) => remaining);
    setLogicalModel(null);
  }

  function connectAttributeToEntity(sourceEntityId: string, attributeId: string, targetEntityId: string) {
    if (sourceEntityId === targetEntityId) {
      return;
    }

    setConceptualModel((currentModel) => {
      const sourceEntity = currentModel?.entities.find((entity) => entity.id === sourceEntityId);
      const attribute = sourceEntity?.attributes.find((currentAttribute) => currentAttribute.id === attributeId);
      const targetEntityExists = currentModel?.entities.some((entity) => entity.id === targetEntityId);

      if (!currentModel || !attribute || !targetEntityExists) {
        return currentModel;
      }

      return {
        ...currentModel,
        entities: currentModel.entities.map((entity) => {
          if (entity.id === sourceEntityId) {
            return {
              ...entity,
              attributes: entity.attributes.filter((currentAttribute) => currentAttribute.id !== attributeId),
            };
          }

          if (entity.id === targetEntityId) {
            return { ...entity, attributes: [...entity.attributes, attribute] };
          }

          return entity;
        }),
      };
    });
    setElementPositions((currentPositions) => {
      const position = currentPositions[attributePositionKey(sourceEntityId, attributeId)];
      const { [attributePositionKey(sourceEntityId, attributeId)]: _removed, ...remaining } = currentPositions;

      return position ? { ...remaining, [attributePositionKey(targetEntityId, attributeId)]: position } : remaining;
    });
    setSelectedAttribute({ entityId: targetEntityId, attributeId });
    setLogicalModel(null);
  }

  return {
    addAttribute,
    selectAttribute,
    updateAttribute,
    removeAttribute,
    connectAttributeToEntity,
  };
}

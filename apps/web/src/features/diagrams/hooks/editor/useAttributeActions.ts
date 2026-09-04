import type { Attribute, ConceptualModel, ElementKind, LogicalModel } from '../../types';
import type { AttributeSelection, DiagramPosition, StateSetter } from './editor.types';
import { attributePositionKey, createEmptyConceptualModel, createManualAttribute } from './model-factories';
import {
  addAttributeToModel,
  addStandaloneAttributeToModel,
  removeAttributeFromModel,
  updateAttributeInModel,
} from './model-operations';

type AttributeActionDependencies = {
  conceptualModel: ConceptualModel | null;
  setConceptualModel: StateSetter<ConceptualModel | null>;
  setLogicalModel: StateSetter<LogicalModel | null>;
  setElementPositions: StateSetter<Record<string, DiagramPosition>>;
  setSelectedAttribute: StateSetter<AttributeSelection>;
  setSelectedEntityIds: StateSetter<string[]>;
};

export function useAttributeActions({
  conceptualModel,
  setConceptualModel,
  setLogicalModel,
  setElementPositions,
  setSelectedAttribute,
  setSelectedEntityIds,
}: AttributeActionDependencies) {
  function addAttribute(entityId: string | null, kind: ElementKind = 'simple-attribute', position?: DiagramPosition) {
    const entity = conceptualModel?.entities.find((currentEntity) => currentEntity.id === entityId);
    if (entityId !== null && !entity) {
      return;
    }

    const model = conceptualModel ?? createEmptyConceptualModel();
    const attributeCount =
      entityId === null ? (model.standaloneAttributes?.length ?? 0) : (entity?.attributes.length ?? 0);
    const attribute = createManualAttribute(entityId, attributeCount, kind);
    setConceptualModel((currentModel) => {
      const nextModel = currentModel ?? model;
      return entityId === null
        ? addStandaloneAttributeToModel(nextModel, attribute)
        : addAttributeToModel(nextModel, entityId, attribute);
    });
    if (position) {
      setElementPositions((currentPositions) => ({
        ...currentPositions,
        [attributePositionKey(entityId, attribute.id)]: position,
      }));
    }
    setLogicalModel(null);
  }

  function selectAttribute(entityId: string | null, attributeId: string) {
    setSelectedEntityIds([]);
    setSelectedAttribute((currentSelection) =>
      currentSelection?.entityId === entityId && currentSelection.attributeId === attributeId
        ? null
        : { entityId, attributeId },
    );
  }

  function updateAttribute(entityId: string | null, attributeId: string, changes: Partial<Attribute>) {
    setConceptualModel((currentModel) =>
      currentModel ? updateAttributeInModel(currentModel, entityId, attributeId, changes) : currentModel,
    );
    setLogicalModel(null);
  }

  function removeAttribute(entityId: string | null, attributeId: string) {
    setConceptualModel((currentModel) =>
      currentModel ? removeAttributeFromModel(currentModel, entityId, attributeId) : currentModel,
    );
    setSelectedAttribute((currentSelection) =>
      currentSelection?.entityId === entityId && currentSelection.attributeId === attributeId ? null : currentSelection,
    );
    setElementPositions(({ [attributePositionKey(entityId, attributeId)]: _removed, ...remaining }) => remaining);
    setLogicalModel(null);
  }

  function connectAttributeToEntity(
    sourceEntityId: string | null,
    attributeId: string,
    targetEntityId: string,
    entityHandle?: string,
    attributeHandle?: string,
  ) {
    if (sourceEntityId === targetEntityId) {
      return;
    }

    setConceptualModel((currentModel) => {
      const sourceEntity = currentModel?.entities.find((entity) => entity.id === sourceEntityId);
      const attribute =
        sourceEntity?.attributes.find((currentAttribute) => currentAttribute.id === attributeId) ??
        currentModel?.standaloneAttributes?.find((currentAttribute) => currentAttribute.id === attributeId);
      const targetEntityExists = currentModel?.entities.some((entity) => entity.id === targetEntityId);

      if (!currentModel || !attribute || !targetEntityExists) {
        return currentModel;
      }

      return {
        ...currentModel,
        standaloneAttributes: (currentModel.standaloneAttributes ?? []).filter(
          (currentAttribute) => currentAttribute.id !== attributeId,
        ),
        entities: currentModel.entities.map((entity) => {
          if (entity.id === sourceEntityId) {
            return {
              ...entity,
              attributes: entity.attributes.filter((currentAttribute) => currentAttribute.id !== attributeId),
            };
          }

          if (entity.id === targetEntityId) {
            return {
              ...entity,
              attributes: [...entity.attributes, { ...attribute, entityHandle, connectionHandle: attributeHandle }],
            };
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

  function disconnectAttributeFromEntity(entityId: string, attributeId: string) {
    const entity = conceptualModel?.entities.find((currentEntity) => currentEntity.id === entityId);
    const attribute = entity?.attributes.find((currentAttribute) => currentAttribute.id === attributeId);
    if (!attribute) return;

    setConceptualModel((currentModel) => {
      if (!currentModel) return currentModel;
      return {
        ...currentModel,
        entities: currentModel.entities.map((currentEntity) =>
          currentEntity.id === entityId
            ? { ...currentEntity, attributes: currentEntity.attributes.filter((item) => item.id !== attributeId) }
            : currentEntity,
        ),
        standaloneAttributes: [...(currentModel.standaloneAttributes ?? []), attribute],
      };
    });
    setElementPositions((currentPositions) => {
      const position = currentPositions[attributePositionKey(entityId, attributeId)];
      const { [attributePositionKey(entityId, attributeId)]: _removed, ...remaining } = currentPositions;
      return position ? { ...remaining, [attributePositionKey(null, attributeId)]: position } : remaining;
    });
    setSelectedAttribute({ entityId: null, attributeId });
    setLogicalModel(null);
  }

  return {
    addAttribute,
    selectAttribute,
    updateAttribute,
    removeAttribute,
    connectAttributeToEntity,
    disconnectAttributeFromEntity,
  };
}

import type { ConceptualModel, Entity, EntityKind } from '../../types';
import type { AttributeSelection, DiagramPosition, StateSetter } from './editor.types';
import { createEmptyConceptualModel, createManualEntity } from './model-factories';
import { removeEntityFromModel, updateEntityInModel } from './model-operations';

type EntityActionDependencies = {
  conceptualModel: ConceptualModel | null;
  setConceptualModel: StateSetter<ConceptualModel | null>;
  setEntityPositions: StateSetter<Record<string, DiagramPosition>>;
  setElementPositions: StateSetter<Record<string, DiagramPosition>>;
  setSelectedAttribute: StateSetter<AttributeSelection>;
  setSelectedEntityIds: StateSetter<string[]>;
};

export function useEntityActions({
  conceptualModel,
  setConceptualModel,
  setEntityPositions,
  setElementPositions,
  setSelectedAttribute,
  setSelectedEntityIds,
}: EntityActionDependencies) {
  function addEntity(kind: EntityKind = 'regular', position?: DiagramPosition) {
    const entity = createManualEntity(kind, conceptualModel?.entities ?? []);

    setConceptualModel((currentModel) => ({
      ...(currentModel ?? createEmptyConceptualModel()),
      entities: [...(currentModel?.entities ?? []), entity],
    }));
    setSelectedEntityIds([entity.id]);
    if (position) {
      setEntityPositions((currentPositions) => ({ ...currentPositions, [entity.id]: position }));
    }
  }

  function removeEntity(entityId: string) {
    setConceptualModel((currentModel) => (currentModel ? removeEntityFromModel(currentModel, entityId) : currentModel));
    setSelectedAttribute((currentSelection) => (currentSelection?.entityId === entityId ? null : currentSelection));
    setSelectedEntityIds((currentSelection) => currentSelection.filter((selectedId) => selectedId !== entityId));
    setEntityPositions(({ [entityId]: _removed, ...remaining }) => remaining);
    setElementPositions((currentPositions) =>
      Object.fromEntries(Object.entries(currentPositions).filter(([key]) => !key.startsWith(`${entityId}:`))),
    );
  }

  function updateEntityPosition(entityId: string, position: DiagramPosition) {
    setEntityPositions((currentPositions) => ({ ...currentPositions, [entityId]: position }));
  }

  function selectEntity(entityId: string) {
    setSelectedEntityIds((currentSelection) => {
      if (currentSelection.includes(entityId)) {
        return currentSelection;
      }

      return currentSelection.length < 2 ? [...currentSelection, entityId] : [currentSelection[1], entityId];
    });
    setSelectedAttribute(null);
  }

  function updateEntity(entityId: string, changes: Partial<Pick<Entity, 'name' | 'description'>>) {
    setConceptualModel((currentModel) =>
      currentModel ? updateEntityInModel(currentModel, entityId, changes) : currentModel,
    );
  }

  return {
    addEntity,
    addEntityAtPosition: (kind: EntityKind, position: DiagramPosition) => addEntity(kind, position),
    removeEntity,
    updateEntityPosition,
    selectEntity,
    clearEntitySelection: () => setSelectedEntityIds([]),
    updateEntity,
  };
}

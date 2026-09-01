import type { ConceptualModel, LogicalModel } from '../../types';
import type { DiagramPosition, StateSetter } from './editor.types';
import { useRelationshipCreationActions } from './useRelationshipCreationActions';
import { useRelationshipEditingActions } from './useRelationshipEditingActions';

type RelationshipActionDependencies = {
  setConceptualModel: StateSetter<ConceptualModel | null>;
  setLogicalModel: StateSetter<LogicalModel | null>;
  setElementPositions: StateSetter<Record<string, DiagramPosition>>;
  setSelectedEntityIds: StateSetter<string[]>;
};

/** Agrupa as ações públicas de relacionamento do contrato do editor. */
export function useRelationshipActions(dependencies: RelationshipActionDependencies) {
  const creationActions = useRelationshipCreationActions(dependencies);
  const editingActions = useRelationshipEditingActions(dependencies);

  return { ...creationActions, ...editingActions };
}

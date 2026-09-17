import type { Cardinality, ElementKind, EntityKind, Relationship } from '../../types';
import type { DiagramPosition } from './editor.types';

type PaletteActionDependencies = {
  selectedEntityIds: string[];
  addEntity: (kind: EntityKind, position: DiagramPosition) => void;
  addAttribute: (entityId: string | null, kind: ElementKind, position: DiagramPosition) => void;
  addStandaloneRelationship: (kind: Relationship['kind'], position: DiagramPosition) => void;
  createRelationship: (entityIds: string[], name?: string, type?: Cardinality, kind?: Relationship['kind']) => void;
};

const attributeKinds: ElementKind[] = [
  'simple-attribute',
  'multivalued-attribute',
  'composite-attribute',
  'derived-attribute',
  'identifier-attribute',
  'subattribute',
];

const relationshipKinds: ElementKind[] = [
  'relationship',
  'identifying-relationship',
  'one-to-one',
  'one-to-many',
  'many-to-many',
  'generalization',
  'specialization',
  'generalization-specialization',
];

export function usePaletteActions({
  selectedEntityIds,
  addEntity,
  addAttribute,
  addStandaloneRelationship,
  createRelationship,
}: PaletteActionDependencies) {
  function addElementAtPosition(kind: ElementKind, position: DiagramPosition, targetEntityId?: string) {
    if (kind === 'entity' || kind === 'weak-entity' || kind === 'associative-entity') {
      const entityKind = kind === 'weak-entity' ? 'weak' : kind === 'associative-entity' ? 'associative' : 'regular';
      addEntity(entityKind, position);
      return;
    }

    if (attributeKinds.includes(kind)) {
      const targetId = targetEntityId ?? (selectedEntityIds.length === 1 ? selectedEntityIds[0] : undefined);
      addAttribute(targetId ?? null, kind === 'subattribute' ? 'simple-attribute' : kind, position);
      return;
    }

    if (!relationshipKinds.includes(kind)) {
      return;
    }

    const relationshipKind: Relationship['kind'] =
      kind === 'generalization-specialization'
        ? 'generalization'
        : kind === 'generalization' || kind === 'specialization' || kind === 'identifying-relationship'
          ? kind
          : 'relationship';

    if (!targetEntityId || selectedEntityIds.length === 0) {
      addStandaloneRelationship(relationshipKind, position);
      return;
    }

    const isGeneralization = relationshipKind === 'generalization' || relationshipKind === 'specialization';
    const entityIds = isGeneralization
      ? [...selectedEntityIds, targetEntityId].filter(
          (entityId, index, ids): entityId is string => Boolean(entityId) && ids.indexOf(entityId) === index,
        )
      : selectedEntityIds.length >= 2
        ? selectedEntityIds.slice(0, 2)
        : [selectedEntityIds[0], targetEntityId];

    if (entityIds[0] !== entityIds[1]) {
      const cardinality: Cardinality = kind === 'one-to-one' ? '1:1' : kind === 'many-to-many' ? 'N:N' : '1:N';
      createRelationship(entityIds, undefined, cardinality, relationshipKind);
    }
  }

  return { addElementAtPosition };
}

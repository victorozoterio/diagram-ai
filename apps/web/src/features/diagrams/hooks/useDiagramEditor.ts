import { useState } from 'react';

import { convertToLogicalModel, generateConceptualModel } from '@/api/diagrams.api';
import type { Attribute, ConceptualModel, LogicalModel } from '../types';

const defaultDescription =
  'Um cliente pode realizar vários pedidos. Cada pedido pertence a apenas um cliente. O cliente possui nome, email e telefone. O pedido possui data e valor total.';

export function useDiagramEditor() {
  const [description, setDescription] = useState(defaultDescription);
  const [conceptualModel, setConceptualModel] = useState<ConceptualModel | null>(null);
  const [logicalModel, setLogicalModel] = useState<LogicalModel | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedAttribute, setSelectedAttribute] = useState<{
    entityId: string;
    attributeId: string;
  } | null>(null);

  async function generateConceptualDiagram() {
    setError(null);
    setLogicalModel(null);
    setIsGenerating(true);

    try {
      const model = await generateConceptualModel(description);

      setConceptualModel(model);
      setSelectedAttribute(null);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Erro inesperado ao gerar o modelo conceitual.');
    } finally {
      setIsGenerating(false);
    }
  }

  async function convertConceptualToLogicalDiagram() {
    if (!conceptualModel) {
      return;
    }

    setError(null);
    setIsConverting(true);

    try {
      const model = await convertToLogicalModel(conceptualModel);

      setLogicalModel(model);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Erro inesperado ao converter o modelo lógico.');
    } finally {
      setIsConverting(false);
    }
  }

  function clearLogicalModel() {
    setLogicalModel(null);
  }

  function clearDiagram() {
    setConceptualModel(null);
    setLogicalModel(null);
    setError(null);
    setSelectedAttribute(null);
  }

  function createEntityId(name: string) {
    return name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .trim()
      .replace(/\s+/g, '_')
      .toLowerCase();
  }

  function addEntity() {
    const entityNumber = (conceptualModel?.entities.length ?? 0) + 1;

    const entityName = `Nova Entidade ${entityNumber}`;

    const newEntity = {
      id: createEntityId(entityName),
      name: entityName,
      description: 'Entidade adicionada manualmente pelo usuário.',
      attributes: [],
    };

    setConceptualModel((currentModel) => {
      if (!currentModel) {
        return {
          metadata: {
            title: 'Modelo conceitual',
            description: 'Modelo criado manualmente pelo usuário.',
            generatedBy: 'user',
            generatedAt: new Date().toISOString(),
          },
          entities: [newEntity],
          relationships: [],
          ambiguities: [],
        };
      }

      return {
        ...currentModel,
        entities: [...currentModel.entities, newEntity],
      };
    });

    setLogicalModel(null);
  }

  function removeEntity(entityId: string) {
    setConceptualModel((currentModel) => {
      if (!currentModel) {
        return currentModel;
      }

      return {
        ...currentModel,
        entities: currentModel.entities.filter((entity) => entity.id !== entityId),
        relationships: currentModel.relationships.filter((relationship) =>
          relationship.participants.every((participant) => participant.entityId !== entityId),
        ),
      };
    });

    setSelectedAttribute((currentSelection) => (currentSelection?.entityId === entityId ? null : currentSelection));
    setLogicalModel(null);
  }

  function createAttributeId(entityId: string, name: string) {
    return `${entityId}_${name}`
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9\s_]/g, '')
      .trim()
      .replace(/\s+/g, '_')
      .toLowerCase();
  }

  function addAttribute(entityId: string) {
    setConceptualModel((currentModel) => {
      if (!currentModel) {
        return currentModel;
      }

      return {
        ...currentModel,
        entities: currentModel.entities.map((entity) => {
          if (entity.id !== entityId) {
            return entity;
          }

          const attributeNumber = entity.attributes.length + 1;
          const attributeName = `novoAtributo${attributeNumber}`;

          return {
            ...entity,
            attributes: [
              ...entity.attributes,
              {
                id: createAttributeId(entity.id, attributeName),
                name: attributeName,
                type: 'string',
                description: 'Atributo adicionado manualmente pelo usuário.',
                identifier: false,
                required: false,
                unique: false,
                multivalued: false,
                composite: false,
                derived: false,
                components: [],
              },
            ],
          };
        }),
      };
    });

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
    setConceptualModel((currentModel) => {
      if (!currentModel) {
        return currentModel;
      }

      return {
        ...currentModel,
        entities: currentModel.entities.map((entity) =>
          entity.id !== entityId
            ? entity
            : {
                ...entity,
                attributes: entity.attributes.map((attribute) =>
                  attribute.id === attributeId ? { ...attribute, ...changes } : attribute,
                ),
              },
        ),
      };
    });

    setLogicalModel(null);
  }

  function removeAttribute(entityId: string, attributeId: string) {
    setConceptualModel((currentModel) => {
      if (!currentModel) {
        return currentModel;
      }

      return {
        ...currentModel,
        entities: currentModel.entities.map((entity) =>
          entity.id !== entityId
            ? entity
            : { ...entity, attributes: entity.attributes.filter((attribute) => attribute.id !== attributeId) },
        ),
      };
    });

    setSelectedAttribute((currentSelection) =>
      currentSelection?.entityId === entityId && currentSelection.attributeId === attributeId ? null : currentSelection,
    );
    setLogicalModel(null);
  }

  return {
    description,
    conceptualModel,
    logicalModel,
    isGenerating,
    isConverting,
    error,
    canConvertToLogical: !!conceptualModel,
    selectedAttribute,
    setDescription,
    setConceptualModel,
    setLogicalModel,
    generateConceptualDiagram,
    convertConceptualToLogicalDiagram,
    clearLogicalModel,
    clearDiagram,
    addEntity,
    removeEntity,
    addAttribute,
    selectAttribute,
    updateAttribute,
    removeAttribute,
  };
}

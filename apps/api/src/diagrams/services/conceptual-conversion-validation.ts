import { z } from 'zod';

import type { ConceptualModel } from '../schemas/conceptual-model.schema';
import { toSnakeCase } from './logical-model-converter/logical-column.utils';

export type DiagramValidationIssue = {
  code: string;
  path: string;
  message: string;
  hint?: string;
};

/** Remove somente espaços acidentais; a conversão continua aceitando acentos e caracteres especiais. */
export function normalizeConceptualModelForConversion(model: unknown): unknown {
  if (!isRecord(model)) return model;
  const trimAttribute = <T extends { name: string }>(attribute: T) => ({
    ...attribute,
    name: attribute.name.trim(),
  });

  return {
    ...model,
    entities: Array.isArray(model.entities)
      ? model.entities.map((entity) =>
          isRecord(entity) && typeof entity.name === 'string' && Array.isArray(entity.attributes)
            ? {
                ...entity,
                name: entity.name.trim(),
                attributes: entity.attributes.map((attribute) =>
                  hasStringName(attribute) ? trimAttribute(attribute) : attribute,
                ),
              }
            : entity,
        )
      : model.entities,
    standaloneAttributes: Array.isArray(model.standaloneAttributes)
      ? model.standaloneAttributes.map((attribute) => (hasStringName(attribute) ? trimAttribute(attribute) : attribute))
      : model.standaloneAttributes,
    relationships: Array.isArray(model.relationships)
      ? model.relationships.map((relationship) =>
          isRecord(relationship) && typeof relationship.name === 'string' && Array.isArray(relationship.attributes)
            ? {
                ...relationship,
                name: relationship.name.trim(),
                attributes: relationship.attributes.map((attribute) =>
                  hasStringName(attribute) ? trimAttribute(attribute) : attribute,
                ),
              }
            : relationship,
        )
      : model.relationships,
  };
}

export function validateConceptualModelForConversion(model: ConceptualModel): DiagramValidationIssue[] {
  const issues: DiagramValidationIssue[] = [];
  const entityIds = new Set(model.entities.map((entity) => entity.id));

  collectDuplicates(model.entities, (entity) => entity.id, 'entity-id-duplicate', 'identificador', issues);
  collectDuplicates(
    model.entities,
    (entity) => toSnakeCase(entity.name),
    'entity-name-duplicate',
    'nome técnico da tabela',
    issues,
  );

  model.entities.forEach((entity, entityIndex) => {
    collectDuplicates(
      entity.attributes,
      (attribute) => toSnakeCase(attribute.name),
      'attribute-name-duplicate',
      `nome de coluna da entidade “${entity.name}”`,
      issues,
      `entities.${entityIndex}.attributes`,
    );
  });

  collectDuplicates(
    model.relationships,
    (relationship) => relationship.id,
    'relationship-id-duplicate',
    'identificador',
    issues,
  );

  model.relationships.forEach((relationship, relationshipIndex) => {
    const path = `relationships.${relationshipIndex}`;
    if (relationship.kind === 'generalization' || relationship.kind === 'specialization') return;

    if (relationship.participants.length !== 2) {
      issues.push({
        code: 'relationship-participants-invalid',
        path: `${path}.participants`,
        message: `O relacionamento “${relationship.name}” deve ligar exatamente duas entidades para ser convertido.`,
        hint: 'Informe duas entidades participantes ou represente a associação de outra forma.',
      });
    }

    const participantIds = new Set<string>();
    relationship.participants.forEach((participant, participantIndex) => {
      if (!entityIds.has(participant.entityId)) {
        issues.push({
          code: 'relationship-reference-invalid',
          path: `${path}.participants.${participantIndex}.entityId`,
          message: `O relacionamento “${relationship.name}” referencia uma entidade que não existe.`,
          hint: 'Selecione uma entidade válida para esse participante.',
        });
      }
      if (participantIds.has(participant.entityId)) {
        issues.push({
          code: 'relationship-participant-duplicate',
          path: `${path}.participants.${participantIndex}.entityId`,
          message: `O relacionamento “${relationship.name}” repete a mesma entidade participante.`,
          hint: 'Cada lado do relacionamento deve apontar para uma entidade diferente.',
        });
      }
      participantIds.add(participant.entityId);
    });
  });

  return issues;
}

export function conceptualSchemaIssues(error: z.ZodError, source: unknown): DiagramValidationIssue[] {
  const model = source as { entities?: Array<{ name?: unknown }>; relationships?: Array<{ name?: unknown }> };
  return error.issues.map((issue) => {
    const [scope, index, field] = issue.path;
    const entity = scope === 'entities' && typeof index === 'number' ? model.entities?.[index] : undefined;
    const relationship =
      scope === 'relationships' && typeof index === 'number' ? model.relationships?.[index] : undefined;
    const subject = entity?.name || relationship?.name;
    const prefix = entity
      ? `A entidade${subject ? ` “${subject}”` : ` #${Number(index) + 1}`}`
      : relationship
        ? `O relacionamento${subject ? ` “${subject}”` : ` #${Number(index) + 1}`}`
        : undefined;

    return {
      code: `conceptual-schema-${String(field ?? 'model')}`,
      path: issue.path.join('.'),
      message: prefix ? `${prefix}: ${issue.message}` : issue.message,
    };
  });
}

function collectDuplicates<T>(
  values: T[],
  key: (value: T) => string,
  code: string,
  label: string,
  issues: DiagramValidationIssue[],
  pathPrefix = 'entities',
): void {
  const known = new Set<string>();
  values.forEach((value, index) => {
    const valueKey = key(value);
    if (known.has(valueKey)) {
      issues.push({
        code,
        path: `${pathPrefix}.${index}`,
        message: `Há dois elementos com o mesmo ${label} após a normalização: “${valueKey}”.`,
        hint: 'Renomeie um dos elementos para que a conversão possa criar tabelas e colunas distintas.',
      });
    }
    known.add(valueKey);
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function hasStringName(value: unknown): value is Record<string, unknown> & { name: string } {
  return isRecord(value) && typeof value.name === 'string';
}

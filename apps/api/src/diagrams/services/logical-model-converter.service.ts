import { Injectable } from '@nestjs/common';
import { ConceptualModel } from '../schemas/conceptual-model.schema';
import { LogicalConversionRelationship, LogicalModel } from '../schemas/logical-model.schema';
import { ensurePrimaryKey } from './logical-model-converter/logical-column.utils';
import { applyRelationshipConversions } from './logical-model-converter/relationship-converters';
import {
  applyGeneralizationConversions,
  applyMultivaluedAttributes,
  convertEntitiesToTables,
} from './logical-model-converter/table-converters';
import { normalizeLogicalModelConstraints } from './logical-model-normalizer';

/**
 * Orquestra a conversão do modelo conceitual.
 * As regras de mapeamento vivem em funções puras no diretório adjacente.
 */
@Injectable()
export class LogicalModelConverterService {
  convert(conceptualModel: ConceptualModel): LogicalModel {
    const tables = convertEntitiesToTables(conceptualModel.entities);

    tables.forEach(ensurePrimaryKey);
    applyGeneralizationConversions(tables, conceptualModel.relationships);
    applyRelationshipConversions(tables, conceptualModel.relationships);
    applyMultivaluedAttributes(tables, conceptualModel.entities);

    return normalizeLogicalModelConstraints({
      tables,
      conversionMetadata: {
        relationships: conceptualModel.relationships.flatMap<LogicalConversionRelationship>((relationship) => {
          if (relationship.kind === 'generalization' || relationship.kind === 'specialization') {
            return [];
          }

          if (relationship.type === 'N:N') {
            return [
              {
                id: relationship.id,
                name: relationship.name,
                type: relationship.type,
                associationTableId: relationship.id,
              },
            ];
          }

          const [firstParticipant, secondParticipant] = relationship.participants;
          if (!firstParticipant || !secondParticipant) return [];

          const oneParticipant =
            relationship.type === '1:N'
              ? relationship.participants.find((participant) => participant.cardinality === '1')
              : firstParticipant;
          const foreignKeyParticipant =
            relationship.type === '1:N'
              ? relationship.participants.find((participant) => participant.cardinality === 'N')
              : secondParticipant;
          if (!oneParticipant || !foreignKeyParticipant) return [];

          return [
            {
              id: relationship.id,
              name: relationship.name,
              type: relationship.type,
              referencedTableId: oneParticipant.entityId,
              foreignKeyTableId: foreignKeyParticipant.entityId,
            },
          ];
        }),
        compositeAttributes: conceptualModel.entities.flatMap((entity) =>
          entity.attributes.flatMap((attribute) => {
            if (!attribute.composite || attribute.components.length === 0) return [];

            return [
              {
                tableId: entity.id,
                id: attribute.id,
                name: attribute.name,
                type: attribute.type,
                required: attribute.required,
                unique: attribute.unique,
                components: attribute.components.map((component) => ({
                  ...component,
                  columnId: `${entity.id}_${component.id}`,
                })),
              },
            ];
          }),
        ),
      },
    });
  }
}

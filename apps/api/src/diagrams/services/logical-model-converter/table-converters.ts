import { Entity, Relationship } from '../../schemas/conceptual-model.schema';
import { LogicalTable } from '../../schemas/logical-model.schema';
import {
  columnsFromAttribute,
  createForeignKeyColumn,
  ensurePrimaryKey,
  findTable,
  foreignKeyName,
  mapAttributeType,
} from './logical-column.utils';

export function convertEntitiesToTables(entities: Entity[]): LogicalTable[] {
  return entities.map((entity) => ({
    id: entity.id,
    name: entity.name,
    columns: entity.attributes.flatMap((attribute) => columnsFromAttribute(entity.id, attribute)),
  }));
}

/**
 * Aplica table-per-type: cada subtipo compartilha a chave do supertipo como PK e FK.
 */
export function applyGeneralizationConversions(tables: LogicalTable[], relationships: Relationship[]): void {
  for (const relationship of relationships) {
    if (!isGeneralization(relationship) || !relationship.supertypeId) continue;

    const supertypeTable = findTable(tables, relationship.supertypeId);
    if (!supertypeTable) continue;

    const supertypePrimaryKey = ensurePrimaryKey(supertypeTable);

    for (const subtypeId of relationship.subtypeIds) {
      const subtypeTable = findTable(tables, subtypeId);
      if (!subtypeTable) continue;

      const inheritedColumnId = `${subtypeTable.id}_${supertypeTable.id}_id`;
      const inheritedColumn = subtypeTable.columns.find((column) => column.id === inheritedColumnId);

      subtypeTable.columns = subtypeTable.columns.filter((column) => !column.primaryKey || column === inheritedColumn);

      if (inheritedColumn) {
        inheritedColumn.name = foreignKeyName(supertypeTable);
        inheritedColumn.type = supertypePrimaryKey.type;
        inheritedColumn.primaryKey = true;
        inheritedColumn.foreignKey = true;
        inheritedColumn.required = true;
        inheritedColumn.references = {
          tableId: supertypeTable.id,
          columnId: supertypePrimaryKey.id,
        };
        continue;
      }

      subtypeTable.columns.unshift(
        createForeignKeyColumn({
          id: inheritedColumnId,
          name: foreignKeyName(supertypeTable),
          referencedTable: supertypeTable,
          referencedColumn: supertypePrimaryKey,
          primaryKey: true,
        }),
      );
    }
  }
}

export function applyMultivaluedAttributes(tables: LogicalTable[], entities: Entity[]): void {
  for (const entity of entities) {
    const table = findTable(tables, entity.id);
    if (!table) {
      continue;
    }

    const primaryKey = ensurePrimaryKey(table);
    const multivaluedAttributes = entity.attributes.filter((attribute) => attribute.multivalued);

    for (const attribute of multivaluedAttributes) {
      tables.push({
        id: `${entity.id}_${attribute.id}`,
        name: `${entity.name}${toPascalCase(attribute.name)}`,
        columns: [
          {
            id: `${entity.id}_${attribute.id}_id`,
            name: 'id',
            type: 'uuid',
            primaryKey: true,
            foreignKey: false,
            required: true,
            unique: false,
          },
          createForeignKeyColumn({
            id: `${entity.id}_${attribute.id}_${entity.id}_id`,
            name: foreignKeyName(table),
            referencedTable: table,
            referencedColumn: primaryKey,
          }),
          {
            id: attribute.id,
            name: attribute.name,
            type: mapAttributeType(attribute.type),
            primaryKey: false,
            foreignKey: false,
            required: attribute.required,
            unique: attribute.unique,
          },
        ],
      });
    }
  }
}

export function relationshipAttributesToColumns(relationship: Relationship) {
  return relationship.attributes.flatMap((attribute) => columnsFromAttribute(relationship.id, attribute));
}

function toPascalCase(value: string): string {
  return value
    .replace(/[_-]+/g, ' ')
    .replace(/\s+(.)/g, (_, character: string) => character.toUpperCase())
    .replace(/^(.)/, (_, character: string) => character.toUpperCase())
    .replace(/\s/g, '');
}

function isGeneralization(relationship: Relationship): boolean {
  return relationship.kind === 'generalization' || relationship.kind === 'specialization';
}

import { Entity, Relationship } from '../../schemas/conceptual-model.schema';
import { LogicalTable } from '../../schemas/logical-model.schema';
import {
  columnsFromAttribute,
  createForeignKeyColumn,
  ensurePrimaryKey,
  findTable,
  mapAttributeType,
} from './logical-column.utils';

export function convertEntitiesToTables(entities: Entity[]): LogicalTable[] {
  return entities.map((entity) => ({
    id: entity.id,
    name: entity.name,
    columns: entity.attributes.flatMap((attribute) => columnsFromAttribute(entity.id, attribute)),
  }));
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
            unique: true,
          },
          createForeignKeyColumn({
            id: `${entity.id}_${attribute.id}_${entity.id}_id`,
            name: `${entity.id}Id`,
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

import { Relationship } from '../../schemas/conceptual-model.schema';
import { LogicalTable } from '../../schemas/logical-model.schema';
import { addOrPromoteForeignKey, createForeignKeyColumn, ensurePrimaryKey, findTable } from './logical-column.utils';
import { relationshipAttributesToColumns } from './table-converters';

export function applyRelationshipConversions(tables: LogicalTable[], relationships: Relationship[]): void {
  for (const relationship of relationships) {
    if (relationship.type === '1:1') {
      applyOneToOneRelationship(tables, relationship);
    }

    if (relationship.type === '1:N') {
      applyOneToManyRelationship(tables, relationship);
    }

    if (relationship.type === 'N:N') {
      applyManyToManyRelationship(tables, relationship);
    }
  }
}

function applyOneToOneRelationship(tables: LogicalTable[], relationship: Relationship): void {
  const [firstParticipant, secondParticipant] = relationship.participants;
  if (!firstParticipant || !secondParticipant) {
    return;
  }

  const firstTable = findTable(tables, firstParticipant.entityId);
  const secondTable = findTable(tables, secondParticipant.entityId);
  if (!firstTable || !secondTable) {
    return;
  }

  addOrPromoteForeignKey({
    targetTable: secondTable,
    referencedTable: firstTable,
    referencedColumn: ensurePrimaryKey(firstTable),
    unique: true,
  });
}

function applyOneToManyRelationship(tables: LogicalTable[], relationship: Relationship): void {
  const oneSide = relationship.participants.find((participant) => participant.cardinality === '1');
  const manySide = relationship.participants.find((participant) => participant.cardinality === 'N');
  if (!oneSide || !manySide) {
    return;
  }

  const oneTable = findTable(tables, oneSide.entityId);
  const manyTable = findTable(tables, manySide.entityId);
  if (!oneTable || !manyTable) {
    return;
  }

  addOrPromoteForeignKey({
    targetTable: manyTable,
    referencedTable: oneTable,
    referencedColumn: ensurePrimaryKey(oneTable),
    unique: false,
  });
}

function applyManyToManyRelationship(tables: LogicalTable[], relationship: Relationship): void {
  const [firstParticipant, secondParticipant] = relationship.participants;
  if (!firstParticipant || !secondParticipant) {
    return;
  }

  const firstTable = findTable(tables, firstParticipant.entityId);
  const secondTable = findTable(tables, secondParticipant.entityId);
  if (!firstTable || !secondTable) {
    return;
  }

  const firstPrimaryKey = ensurePrimaryKey(firstTable);
  const secondPrimaryKey = ensurePrimaryKey(secondTable);
  tables.push({
    id: relationship.id,
    name: toPascalCase(relationship.name),
    columns: [
      createForeignKeyColumn({
        id: `${relationship.id}_${firstTable.id}_id`,
        name: `${firstTable.id}Id`,
        referencedTable: firstTable,
        referencedColumn: firstPrimaryKey,
        primaryKey: true,
      }),
      createForeignKeyColumn({
        id: `${relationship.id}_${secondTable.id}_id`,
        name: `${secondTable.id}Id`,
        referencedTable: secondTable,
        referencedColumn: secondPrimaryKey,
        primaryKey: true,
      }),
      ...relationshipAttributesToColumns(relationship),
    ],
  });
}

function toPascalCase(value: string): string {
  return value
    .replace(/[_-]+/g, ' ')
    .replace(/\s+(.)/g, (_, character: string) => character.toUpperCase())
    .replace(/^(.)/, (_, character: string) => character.toUpperCase())
    .replace(/\s/g, '');
}

import { Attribute } from '../../schemas/conceptual-model.schema';
import { LogicalColumn, LogicalColumnType, LogicalTable } from '../../schemas/logical-model.schema';

export function columnsFromAttribute(entityId: string, attribute: Attribute): LogicalColumn[] {
  if (attribute.composite && attribute.components.length > 0) {
    return attribute.components.map((component) => ({
      id: `${entityId}_${component.id}`,
      name: component.name,
      type: mapAttributeType(component.type),
      primaryKey: false,
      foreignKey: false,
      required: attribute.required,
      unique: false,
    }));
  }

  if (attribute.multivalued || attribute.derived) {
    return [];
  }

  return [
    {
      id: attribute.id,
      name: attribute.name,
      type: mapAttributeType(attribute.type),
      primaryKey: attribute.identifier,
      foreignKey: false,
      required: attribute.required,
      unique: attribute.unique,
    },
  ];
}

export function mapAttributeType(type: Attribute['type']): LogicalColumnType {
  const typeMap: Record<Attribute['type'], LogicalColumnType> = {
    string: 'varchar',
    number: 'integer',
    boolean: 'boolean',
    date: 'date',
    datetime: 'timestamp',
    text: 'text',
    decimal: 'decimal',
    uuid: 'uuid',
    email: 'varchar',
    phone: 'varchar',
    unknown: 'unknown',
  };

  return typeMap[type];
}

export function findTable(tables: LogicalTable[], tableId: string): LogicalTable | undefined {
  return tables.find((table) => table.id === tableId);
}

export function ensurePrimaryKey(table: LogicalTable): LogicalColumn {
  const existingPrimaryKey = table.columns.find((column) => column.primaryKey);
  if (existingPrimaryKey) {
    return existingPrimaryKey;
  }

  const idColumn: LogicalColumn = {
    id: `${table.id}_id`,
    name: 'id',
    type: 'uuid',
    primaryKey: true,
    foreignKey: false,
    required: true,
    unique: true,
  };
  table.columns.unshift(idColumn);

  return idColumn;
}

export function createForeignKeyColumn({
  id,
  name,
  referencedTable,
  referencedColumn,
  primaryKey = false,
  unique = false,
  required = true,
}: {
  id: string;
  name: string;
  referencedTable: LogicalTable;
  referencedColumn: LogicalColumn;
  primaryKey?: boolean;
  unique?: boolean;
  required?: boolean;
}): LogicalColumn {
  return {
    id,
    name,
    type: referencedColumn.type,
    primaryKey,
    foreignKey: true,
    required,
    unique,
    references: {
      tableId: referencedTable.id,
      columnId: referencedColumn.id,
    },
  };
}

export function addOrPromoteForeignKey({
  targetTable,
  referencedTable,
  referencedColumn,
  unique,
}: {
  targetTable: LogicalTable;
  referencedTable: LogicalTable;
  referencedColumn: LogicalColumn;
  unique: boolean;
}): void {
  const expectedId = `${referencedTable.id}_id`;
  const expectedName = `${referencedTable.id}_id`;
  const existingColumn = findForeignKeyCandidate(targetTable, referencedTable, expectedId, expectedName);

  if (existingColumn) {
    existingColumn.type = referencedColumn.type;
    existingColumn.foreignKey = true;
    existingColumn.required = true;
    existingColumn.unique = unique;
    existingColumn.references = {
      tableId: referencedTable.id,
      columnId: referencedColumn.id,
    };
    return;
  }

  targetTable.columns.push(
    createForeignKeyColumn({
      id: expectedId,
      name: expectedName,
      referencedTable,
      referencedColumn,
      unique,
    }),
  );
}

function findForeignKeyCandidate(
  targetTable: LogicalTable,
  referencedTable: LogicalTable,
  expectedId: string,
  expectedName: string,
): LogicalColumn | undefined {
  const normalizedExpectedName = normalizeColumnName(expectedName);
  const normalizedReferencedTableId = normalizeColumnName(referencedTable.id);
  const normalizedReferencedTableName = normalizeColumnName(referencedTable.name);

  return targetTable.columns.find((column) => {
    if (column.id === expectedId) {
      return true;
    }

    const normalizedColumnName = normalizeColumnName(column.name);
    return (
      normalizedColumnName === normalizedExpectedName ||
      normalizedColumnName === `${normalizedReferencedTableId}id` ||
      normalizedColumnName === `${normalizedReferencedTableName}id` ||
      normalizedColumnName === `${normalizedReferencedTableId}_id`
    );
  });
}

function normalizeColumnName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toLowerCase();
}

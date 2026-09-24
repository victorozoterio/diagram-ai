import { LogicalModel, LogicalModelSchema } from '../../../diagrams/schemas/logical-model.schema';
import {
  addOrPromoteForeignKey,
  ensurePrimaryKey,
  findTable,
  toSnakeCase,
} from '../../../diagrams/services/logical-model-converter/logical-column.utils';
import { normalizeLogicalModelConstraints } from '../../../diagrams/services/logical-model-normalizer';
import { GeneratedLogicalModelSchema } from './logical-model-generation.schema';
import { OllamaError } from './ollama.errors';

export function parseLogicalModelResponse(content: string, description: string): LogicalModel {
  try {
    const generatedModel = GeneratedLogicalModelSchema.parse(JSON.parse(content));
    const tableIds = uniqueIdentifiers(generatedModel.tables.map((table) => table.name));
    const tableIdByName = new Map(
      generatedModel.tables.map((table, index) => [normalizeName(table.name), tableIds[index]]),
    );
    const columnNamesByTable = generatedModel.tables.map((table) =>
      uniqueIdentifiers(table.columns.map((column) => column.name)),
    );
    const columnIdsByTable = generatedModel.tables.map((table, tableIndex) => {
      const columnIds = columnNamesByTable[tableIndex];
      return new Map(
        table.columns.map((column, columnIndex) => [
          normalizeName(column.name),
          `${tableIds[tableIndex]}_${columnIds[columnIndex]}`,
        ]),
      );
    });

    const model = LogicalModelSchema.parse({
      tables: generatedModel.tables.map((table, tableIndex) => ({
        id: tableIds[tableIndex],
        name: toSnakeCase(table.name),
        columns: table.columns.map((column, columnIndex) => {
          const reference = column.references
            ? resolveReference(column.references, tableIdByName, columnIdsByTable, generatedModel.tables)
            : undefined;

          if (column.foreignKey && !reference) {
            throw new Error(`A FK ${column.name} não possui uma referência válida.`);
          }

          return {
            id: `${tableIds[tableIndex]}_${columnNamesByTable[tableIndex][columnIndex]}`,
            name: toSnakeCase(column.name),
            type: column.type,
            primaryKey: column.primaryKey ?? false,
            foreignKey: column.foreignKey ?? Boolean(reference),
            required: false,
            unique: false,
            ...(reference ? { references: reference } : {}),
          };
        }),
      })),
    });

    model.tables.forEach(ensurePrimaryKey);
    applyOneToManyRelationships(model, generatedModel.oneToMany);
    applyOneToOneRelationships(model, generatedModel.oneToOne);
    applyManyToManyRelationships(model, generatedModel.manyToMany);
    applyExplicitConstraints(model, generatedModel.constraints, description);

    return normalizeLogicalModelConstraints(model);
  } catch (error) {
    throw new OllamaError('invalid_response', 'O JSON retornado não segue a estrutura do modelo lógico.', {
      cause: error,
    });
  }
}

function applyExplicitConstraints(
  model: LogicalModel,
  constraints: {
    unique: { table: string; column: string; evidence: string }[];
    notNull: { table: string; column: string; evidence: string }[];
  },
  description: string,
): void {
  for (const constraint of constraints.unique) {
    const column = findConstraintColumn(model, constraint.table, constraint.column);
    if (column && hasExplicitEvidence(description, constraint.evidence, 'unique')) {
      column.unique = true;
    }
  }

  for (const constraint of constraints.notNull) {
    const column = findConstraintColumn(model, constraint.table, constraint.column);
    if (column && hasExplicitEvidence(description, constraint.evidence, 'notNull')) {
      column.required = true;
      column.nullable = false;
    }
  }
}

function findConstraintColumn(model: LogicalModel, tableName: string, columnName: string) {
  const table = findTable(model.tables, toSnakeCase(tableName));
  return table?.columns.find((column) => normalizeName(column.name) === normalizeName(columnName));
}

function hasExplicitEvidence(description: string, evidence: string, kind: 'unique' | 'notNull'): boolean {
  const normalizedDescription = normalizeEvidence(description);
  const normalizedEvidence = normalizeEvidence(evidence);

  if (!normalizedEvidence || !normalizedDescription.includes(normalizedEvidence)) {
    return false;
  }

  return kind === 'unique'
    ? /\bunic[oa]\b|\bunique\b|\bexclusiv[oa]\b/.test(normalizedEvidence)
    : /\bobrigatori[oa]\b|\brequired\b|\bnot null\b|\bnao nulo\b|\bnao pode ser nulo\b/.test(normalizedEvidence);
}

function normalizeEvidence(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function applyOneToManyRelationships(
  model: LogicalModel,
  relationships: { oneTable: string; manyTable: string }[],
): void {
  for (const relationship of relationships) {
    const oneTable = findTable(model.tables, toSnakeCase(relationship.oneTable));
    const manyTable = findTable(model.tables, toSnakeCase(relationship.manyTable));

    if (!oneTable || !manyTable || oneTable.id === manyTable.id) {
      throw new Error(`Relação 1:N inválida entre ${relationship.oneTable} e ${relationship.manyTable}.`);
    }

    addOrPromoteForeignKey({
      targetTable: manyTable,
      referencedTable: oneTable,
      referencedColumn: ensurePrimaryKey(oneTable),
      unique: false,
    });
  }
}

function applyOneToOneRelationships(
  model: LogicalModel,
  relationships: { referencedTable: string; targetTable: string }[],
): void {
  for (const relationship of relationships) {
    const referencedTable = findTable(model.tables, toSnakeCase(relationship.referencedTable));
    const targetTable = findTable(model.tables, toSnakeCase(relationship.targetTable));

    if (!referencedTable || !targetTable || referencedTable.id === targetTable.id) {
      throw new Error(`Relação 1:1 inválida entre ${relationship.referencedTable} e ${relationship.targetTable}.`);
    }

    addOrPromoteForeignKey({
      targetTable,
      referencedTable,
      referencedColumn: ensurePrimaryKey(referencedTable),
      unique: true,
    });
  }
}

function applyManyToManyRelationships(
  model: LogicalModel,
  relationships: { firstTable: string; secondTable: string; associationTable: string }[],
): void {
  for (const relationship of relationships) {
    const firstTable = findTable(model.tables, toSnakeCase(relationship.firstTable));
    const secondTable = findTable(model.tables, toSnakeCase(relationship.secondTable));
    const associationTable = findTable(model.tables, toSnakeCase(relationship.associationTable));

    if (
      !firstTable ||
      !secondTable ||
      !associationTable ||
      firstTable.id === secondTable.id ||
      associationTable.id === firstTable.id ||
      associationTable.id === secondTable.id
    ) {
      throw new Error(`Relação N:N inválida entre ${relationship.firstTable} e ${relationship.secondTable}.`);
    }

    const firstPrimaryKey = ensurePrimaryKey(firstTable);
    const secondPrimaryKey = ensurePrimaryKey(secondTable);

    addOrPromoteForeignKey({
      targetTable: associationTable,
      referencedTable: firstTable,
      referencedColumn: firstPrimaryKey,
      unique: false,
    });
    addOrPromoteForeignKey({
      targetTable: associationTable,
      referencedTable: secondTable,
      referencedColumn: secondPrimaryKey,
      unique: false,
    });

    associationTable.columns.forEach((column) => {
      if (column.references?.tableId === firstTable.id || column.references?.tableId === secondTable.id) {
        column.primaryKey = true;
      }
    });
    associationTable.columns = associationTable.columns.filter((column) => column.foreignKey || !column.primaryKey);
  }
}

function resolveReference(
  reference: { table: string; column: string },
  tableIdByName: Map<string, string>,
  columnIdsByTable: Map<string, string>[],
  tables: { name: string }[],
) {
  const tableIndex = tables.findIndex((table) => normalizeName(table.name) === normalizeName(reference.table));
  const tableId = tableIdByName.get(normalizeName(reference.table));
  const columnId = tableIndex >= 0 ? columnIdsByTable[tableIndex].get(normalizeName(reference.column)) : undefined;

  if (!tableId || !columnId) {
    throw new Error(`Referência inválida para ${reference.table}.${reference.column}.`);
  }

  return { tableId, columnId };
}

function uniqueIdentifiers(names: string[]) {
  const used = new Map<string, number>();
  return names.map((name) => {
    const base = toSnakeCase(name) || 'item';
    const count = used.get(base) ?? 0;
    used.set(base, count + 1);
    return count === 0 ? base : `${base}_${count + 1}`;
  });
}

function normalizeName(value: string) {
  return toSnakeCase(value);
}

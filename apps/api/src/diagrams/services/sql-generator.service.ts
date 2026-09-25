import { Injectable } from '@nestjs/common';

import { LogicalColumn, LogicalColumnType, LogicalModel, LogicalTable } from '../schemas/logical-model.schema';

export const SQL_DIALECTS = ['postgresql', 'mysql', 'mariadb', 'sqlserver'] as const;
export type SqlDialect = (typeof SQL_DIALECTS)[number];

type SqlDialectRenderer = {
  quoteIdentifier: (value: string) => string;
  columnType: (type: LogicalColumnType) => string;
};

const DIALECTS: Record<SqlDialect, SqlDialectRenderer> = {
  postgresql: {
    quoteIdentifier: (value) => `"${escapeIdentifier(value, '"')}"`,
    columnType: postgresType,
  },
  mysql: {
    quoteIdentifier: (value) => `\`${escapeIdentifier(value, '`')}\``,
    columnType: mysqlType,
  },
  mariadb: {
    quoteIdentifier: (value) => `\`${escapeIdentifier(value, '`')}\``,
    columnType: mysqlType,
  },
  sqlserver: {
    quoteIdentifier: (value) => `[${escapeIdentifier(value, ']')}]`,
    columnType: sqlServerType,
  },
};

@Injectable()
export class SqlGeneratorService {
  generate(model: LogicalModel, dialect: SqlDialect): string {
    const renderer = DIALECTS[dialect];
    const tablesById = new Map(model.tables.map((table) => [table.id, table]));
    const statements = model.tables.map((table) => this.createTableStatement(table, renderer));
    const foreignKeyStatements = model.tables.flatMap((table) =>
      table.columns
        .filter((column) => column.foreignKey && column.references)
        .map((column) => this.foreignKeyStatement(table, column, tablesById, renderer)),
    );

    return [...statements, ...foreignKeyStatements].join('\n\n');
  }

  private createTableStatement(table: LogicalTable, renderer: SqlDialectRenderer): string {
    const definitions = table.columns.map((column) => this.columnDefinition(column, renderer));
    const primaryKey = table.columns.filter((column) => column.primaryKey);

    if (primaryKey.length > 0) {
      definitions.push(
        `CONSTRAINT ${renderer.quoteIdentifier(`pk_${table.id}`)} PRIMARY KEY (${primaryKey
          .map((column) => renderer.quoteIdentifier(column.name))
          .join(', ')})`,
      );
    }

    table.columns
      .filter((column) => column.unique && !column.primaryKey)
      .forEach((column) => {
        definitions.push(
          `CONSTRAINT ${renderer.quoteIdentifier(`uq_${table.id}_${column.id}`)} UNIQUE (${renderer.quoteIdentifier(column.name)})`,
        );
      });

    return [`CREATE TABLE ${renderer.quoteIdentifier(table.name)} (`, indent(definitions.join(',\n')), ');'].join('\n');
  }

  private columnDefinition(column: LogicalColumn, renderer: SqlDialectRenderer): string {
    const notNull = column.primaryKey || column.required || column.nullable === false;
    return [
      renderer.quoteIdentifier(column.name),
      renderer.columnType(column.type),
      notNull ? 'NOT NULL' : 'NULL',
    ].join(' ');
  }

  private foreignKeyStatement(
    table: LogicalTable,
    column: LogicalColumn,
    tablesById: Map<string, LogicalTable>,
    renderer: SqlDialectRenderer,
  ): string {
    const reference = column.references;
    if (!reference) {
      throw new Error(`A coluna FK ${table.name}.${column.name} não possui referência.`);
    }

    const referencedTable = tablesById.get(reference.tableId);
    const referencedColumn = referencedTable?.columns.find((candidate) => candidate.id === reference.columnId);
    if (!referencedTable || !referencedColumn) {
      throw new Error(`Referência inválida para ${table.name}.${column.name}.`);
    }

    return [
      `ALTER TABLE ${renderer.quoteIdentifier(table.name)}`,
      `  ADD CONSTRAINT ${renderer.quoteIdentifier(`fk_${table.id}_${column.id}`)}`,
      `  FOREIGN KEY (${renderer.quoteIdentifier(column.name)})`,
      `  REFERENCES ${renderer.quoteIdentifier(referencedTable.name)} (${renderer.quoteIdentifier(referencedColumn.name)});`,
    ].join('\n');
  }
}

function indent(value: string): string {
  return value
    .split('\n')
    .map((line) => `  ${line}`)
    .join('\n');
}

function escapeIdentifier(value: string, delimiter: string): string {
  return value.replaceAll(delimiter, delimiter + delimiter);
}

function postgresType(type: LogicalColumnType): string {
  const types: Record<LogicalColumnType, string> = {
    uuid: 'UUID',
    varchar: 'VARCHAR(255)',
    text: 'TEXT',
    integer: 'INTEGER',
    bigint: 'BIGINT',
    decimal: 'DECIMAL(18, 2)',
    boolean: 'BOOLEAN',
    date: 'DATE',
    datetime: 'TIMESTAMP',
    timestamp: 'TIMESTAMP',
    unknown: 'TEXT',
  };
  return types[type];
}

function mysqlType(type: LogicalColumnType): string {
  const types: Record<LogicalColumnType, string> = {
    uuid: 'CHAR(36)',
    varchar: 'VARCHAR(255)',
    text: 'TEXT',
    integer: 'INT',
    bigint: 'BIGINT',
    decimal: 'DECIMAL(18, 2)',
    boolean: 'BOOLEAN',
    date: 'DATE',
    datetime: 'DATETIME',
    timestamp: 'TIMESTAMP',
    unknown: 'TEXT',
  };
  return types[type];
}

function sqlServerType(type: LogicalColumnType): string {
  const types: Record<LogicalColumnType, string> = {
    uuid: 'UNIQUEIDENTIFIER',
    varchar: 'VARCHAR(255)',
    text: 'NVARCHAR(MAX)',
    integer: 'INT',
    bigint: 'BIGINT',
    decimal: 'DECIMAL(18, 2)',
    boolean: 'BIT',
    date: 'DATE',
    datetime: 'DATETIME2',
    timestamp: 'DATETIME2',
    unknown: 'NVARCHAR(MAX)',
  };
  return types[type];
}

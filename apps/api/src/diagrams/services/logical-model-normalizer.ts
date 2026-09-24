import { LogicalModel, LogicalModelSchema } from '../schemas/logical-model.schema';

/**
 * Aplica as constraints que decorrem da própria estrutura relacional.
 *
 * Essa etapa é compartilhada pela conversão do modelo conceitual e pela
 * geração direta, para que os dois caminhos não interpretem nullable/unique
 * de maneiras diferentes.
 */
export function normalizeLogicalModelConstraints(model: LogicalModel): LogicalModel {
  return LogicalModelSchema.parse({
    tables: model.tables.map((table) => ({
      ...table,
      columns: table.columns.map((column) => {
        const primaryKey = column.primaryKey;
        const foreignKey = column.foreignKey;
        const required = primaryKey || foreignKey || column.required || column.nullable === false;

        return {
          ...column,
          primaryKey,
          foreignKey,
          required,
          nullable: !required,
          unique: column.unique,
        };
      }),
    })),
  });
}

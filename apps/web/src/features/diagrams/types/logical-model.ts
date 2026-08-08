export type LogicalColumnType =
  | 'varchar'
  | 'text'
  | 'integer'
  | 'decimal'
  | 'boolean'
  | 'date'
  | 'timestamp'
  | 'uuid'
  | 'unknown';

export type LogicalColumn = {
  id: string;
  name: string;
  type: LogicalColumnType;
  primaryKey: boolean;
  foreignKey: boolean;
  required: boolean;
  unique: boolean;
  references?: {
    tableId: string;
    columnId: string;
  };
};

export type LogicalTable = {
  id: string;
  name: string;
  columns: LogicalColumn[];
};

export type LogicalModel = {
  tables: LogicalTable[];
};

export type LogicalColumnType =
  | 'varchar'
  | 'text'
  | 'integer'
  | 'bigint'
  | 'decimal'
  | 'boolean'
  | 'date'
  | 'datetime'
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
  nullable?: boolean;
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
  position?: {
    x: number;
    y: number;
  };
};

export type LogicalModel = {
  tables: LogicalTable[];
};

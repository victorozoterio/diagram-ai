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
    routeOffset?: number;
  };
};

export type LogicalTable = {
  id: string;
  name: string;
  columns: LogicalColumn[];
  size?: {
    width: number;
    height: number;
  };
  position?: {
    x: number;
    y: number;
  };
};

export type LogicalTableRelationship = {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  routeOffset?: number;
};

export type LogicalModel = {
  tables: LogicalTable[];
  relationships?: LogicalTableRelationship[];
};

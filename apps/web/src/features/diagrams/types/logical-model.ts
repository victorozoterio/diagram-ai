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

export type LogicalConversionRelationship = {
  id: string;
  name: string;
  type: '1:1' | '1:N' | 'N:N';
  foreignKeyTableId?: string;
  referencedTableId?: string;
  associationTableId?: string;
};

export type LogicalConversionCompositeAttribute = {
  tableId: string;
  id: string;
  name: string;
  type: import('./conceptual-model').AttributeType;
  required: boolean;
  unique: boolean;
  components: Array<{
    id: string;
    name: string;
    type: import('./conceptual-model').AttributeType;
    columnId: string;
  }>;
};

export type LogicalModel = {
  tables: LogicalTable[];
  relationships?: LogicalTableRelationship[];
  conversionMetadata?: {
    relationships: LogicalConversionRelationship[];
    compositeAttributes: LogicalConversionCompositeAttribute[];
  };
};

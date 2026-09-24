import { z } from 'zod';

export const LogicalColumnTypeSchema = z.enum([
  'varchar',
  'text',
  'integer',
  'bigint',
  'decimal',
  'boolean',
  'date',
  'datetime',
  'timestamp',
  'uuid',
  'unknown',
]);

export const LogicalColumnSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  type: LogicalColumnTypeSchema.default('unknown'),
  primaryKey: z.boolean().default(false),
  foreignKey: z.boolean().default(false),
  required: z.boolean().default(false),
  nullable: z.boolean().optional(),
  unique: z.boolean().default(false),
  references: z
    .object({
      tableId: z.string().min(1),
      columnId: z.string().min(1),
    })
    .optional(),
});

export const LogicalTableSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  columns: z.array(LogicalColumnSchema).default([]),
});

export const LogicalModelSchema = z.object({
  tables: z.array(LogicalTableSchema).default([]),
});

export type LogicalColumnType = z.infer<typeof LogicalColumnTypeSchema>;
export type LogicalColumn = z.infer<typeof LogicalColumnSchema>;
export type LogicalTable = z.infer<typeof LogicalTableSchema>;
export type LogicalModel = z.infer<typeof LogicalModelSchema>;

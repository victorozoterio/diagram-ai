import { z } from 'zod';
import { AttributeTypeSchema } from './conceptual-model.schema';

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

export const LogicalConversionRelationshipSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  type: z.enum(['1:1', '1:N', 'N:N']),
  foreignKeyTableId: z.string().min(1).optional(),
  referencedTableId: z.string().min(1).optional(),
  associationTableId: z.string().min(1).optional(),
});

export const LogicalConversionMetadataSchema = z.object({
  relationships: z.array(LogicalConversionRelationshipSchema).default([]),
  compositeAttributes: z
    .array(
      z.object({
        tableId: z.string().min(1),
        id: z.string().min(1),
        name: z.string().min(1),
        type: AttributeTypeSchema,
        required: z.boolean(),
        unique: z.boolean(),
        components: z.array(
          z.object({
            id: z.string().min(1),
            name: z.string().min(1),
            type: AttributeTypeSchema,
            columnId: z.string().min(1),
          }),
        ),
      }),
    )
    .default([]),
});

export const LogicalModelSchema = z.object({
  tables: z.array(LogicalTableSchema).default([]),
  conversionMetadata: LogicalConversionMetadataSchema.optional(),
});

export type LogicalColumnType = z.infer<typeof LogicalColumnTypeSchema>;
export type LogicalColumn = z.infer<typeof LogicalColumnSchema>;
export type LogicalTable = z.infer<typeof LogicalTableSchema>;
export type LogicalConversionRelationship = z.infer<typeof LogicalConversionRelationshipSchema>;
export type LogicalConversionMetadata = z.infer<typeof LogicalConversionMetadataSchema>;
export type LogicalConversionCompositeAttribute = LogicalConversionMetadata['compositeAttributes'][number];
export type LogicalModel = z.infer<typeof LogicalModelSchema>;

import { z } from 'zod';
import { LogicalColumnTypeSchema } from '../../../diagrams/schemas/logical-model.schema';

const GeneratedLogicalReferenceSchema = z.object({
  table: z.string().min(1).describe('Tabela que possui a PK/campo referenciado pela FK.'),
  column: z.string().min(1).describe('PK ou campo existente na tabela referenciada.'),
});

const GeneratedLogicalColumnSchema = z.object({
  name: z.string().min(1),
  type: LogicalColumnTypeSchema,
  primaryKey: z.boolean().optional(),
  foreignKey: z
    .boolean()
    .optional()
    .describe('true quando a coluna representa uma relação; nesse caso references é obrigatório.'),
  references: GeneratedLogicalReferenceSchema.optional().describe(
    'Obrigatório para FK: aponta para a tabela e a coluna existentes do lado referenciado da relação.',
  ),
});

const GeneratedLogicalTableSchema = z.object({
  name: z.string().min(1),
  columns: z
    .array(GeneratedLogicalColumnSchema)
    .min(1)
    .describe('Inclua FKs com references para toda relação explícita entre tabelas, especialmente 1:N.'),
});

const GeneratedOneToManySchema = z.object({
  oneTable: z.string().min(1).describe('Tabela no lado 1 da relação.'),
  manyTable: z.string().min(1).describe('Tabela no lado N que deve receber a FK.'),
});

const GeneratedOneToOneSchema = z.object({
  referencedTable: z.string().min(1).describe('Tabela cuja PK será referenciada.'),
  targetTable: z.string().min(1).describe('Tabela que recebe a FK única da relação 1:1.'),
});

const GeneratedManyToManySchema = z.object({
  firstTable: z.string().min(1).describe('Primeira tabela participante da relação N:N.'),
  secondTable: z.string().min(1).describe('Segunda tabela participante da relação N:N.'),
  associationTable: z.string().min(1).describe('Tabela associativa que recebe a PK composta formada pelas duas FKs.'),
});

const GeneratedExplicitConstraintSchema = z.object({
  table: z.string().min(1),
  column: z.string().min(1),
  evidence: z.string().min(1).describe('Trecho literal da descrição que declara a constraint.'),
});

export const GeneratedLogicalModelSchema = z.object({
  tables: z.array(GeneratedLogicalTableSchema).min(1),
  oneToMany: z
    .array(GeneratedOneToManySchema)
    .describe('Liste toda relação explícita 1:N para garantir a FK no lado N, mesmo que ela já esteja em columns.'),
  oneToOne: z
    .array(GeneratedOneToOneSchema)
    .describe('Liste toda relação 1:1 para garantir uma FK unique na tabela de destino.'),
  manyToMany: z
    .array(GeneratedManyToManySchema)
    .describe('Liste toda relação N:N para garantir as duas FKs como PK composta, sem PK artificial.'),
  constraints: z.object({
    unique: z
      .array(GeneratedExplicitConstraintSchema)
      .describe('Somente colunas explicitamente declaradas únicas no requisito.'),
    notNull: z
      .array(GeneratedExplicitConstraintSchema)
      .describe('Somente colunas explicitamente declaradas obrigatórias ou não nulas no requisito.'),
  }),
});

export type GeneratedLogicalModel = z.infer<typeof GeneratedLogicalModelSchema>;
export const GeneratedLogicalModelJsonSchema = z.toJSONSchema(GeneratedLogicalModelSchema);

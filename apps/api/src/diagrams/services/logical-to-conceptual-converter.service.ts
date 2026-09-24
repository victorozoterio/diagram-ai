import { Injectable } from '@nestjs/common';
import {
  Attribute,
  AttributeType,
  ConceptualModel,
  ConceptualModelSchema,
  Entity,
  Relationship,
} from '../schemas/conceptual-model.schema';
import {
  LogicalColumn,
  LogicalConversionCompositeAttribute,
  LogicalConversionRelationship,
  LogicalModel,
  LogicalTable,
} from '../schemas/logical-model.schema';

type Generalization = {
  supertypeTableId: string;
  subtypeTableIds: string[];
  inheritedColumnIds: Set<string>;
};

@Injectable()
export class LogicalToConceptualConverterService {
  convert(logicalModel: LogicalModel): ConceptualModel {
    const tablesById = new Map(logicalModel.tables.map((table) => [table.id, table]));
    const generalizations = findGeneralizations(logicalModel.tables, tablesById);
    const inheritanceColumns = new Set([...generalizations.values()].flatMap((item) => [...item.inheritedColumnIds]));
    const associativeTables = new Set(
      logicalModel.tables.filter((table) => isAssociativeTable(table, tablesById)).map((table) => table.id),
    );
    const entityTables = logicalModel.tables.filter((table) => !associativeTables.has(table.id));

    const entities = entityTables.map((table) =>
      tableToEntity(table, inheritanceColumns, logicalModel.conversionMetadata?.compositeAttributes ?? []),
    );
    const entityIds = new Set(entities.map((entity) => entity.id));
    const relationships = [
      ...generalizationRelationships(generalizations),
      ...associativeRelationships(
        logicalModel.tables,
        associativeTables,
        entityIds,
        logicalModel.conversionMetadata?.relationships ?? [],
      ),
      ...foreignKeyRelationships(
        entityTables,
        associativeTables,
        inheritanceColumns,
        entityIds,
        logicalModel.conversionMetadata?.relationships ?? [],
      ),
    ];

    return ConceptualModelSchema.parse({
      metadata: {},
      entities,
      standaloneAttributes: [],
      relationships,
      ambiguities: [],
    });
  }
}

function findGeneralizations(
  tables: LogicalTable[],
  tablesById: Map<string, LogicalTable>,
): Map<string, Generalization> {
  const generalizations = new Map<string, Generalization>();

  for (const table of tables) {
    const primaryKeys = table.columns.filter((column) => column.primaryKey);
    const inheritedColumn = primaryKeys.find(
      (column) =>
        column.foreignKey && column.references && tablesById.has(column.references.tableId) && primaryKeys.length === 1,
    );
    if (!inheritedColumn?.references) continue;

    const supertypeTableId = inheritedColumn.references.tableId;
    const generalization = generalizations.get(supertypeTableId) ?? {
      supertypeTableId,
      subtypeTableIds: [],
      inheritedColumnIds: new Set<string>(),
    };
    generalization.subtypeTableIds.push(table.id);
    generalization.inheritedColumnIds.add(inheritedColumn.id);
    generalizations.set(supertypeTableId, generalization);
  }

  return generalizations;
}

function isAssociativeTable(table: LogicalTable, tablesById: Map<string, LogicalTable>): boolean {
  const foreignKeys = table.columns.filter(
    (column) =>
      column.foreignKey && column.primaryKey && column.references && tablesById.has(column.references.tableId),
  );
  const referencedTables = new Set(foreignKeys.map((column) => column.references?.tableId));
  const primaryKeys = table.columns.filter((column) => column.primaryKey);

  return foreignKeys.length === 2 && referencedTables.size === 2 && primaryKeys.length === 2;
}

function tableToEntity(
  table: LogicalTable,
  inheritedColumnIds: Set<string>,
  compositeAttributeMetadata: LogicalConversionCompositeAttribute[],
): Entity {
  const composites = compositeAttributeMetadata.filter(
    (attribute) =>
      attribute.tableId === table.id &&
      attribute.components.every((component) => table.columns.some((column) => column.id === component.columnId)),
  );
  const componentColumnIds = new Set(
    composites.flatMap((attribute) => attribute.components.map((component) => component.columnId)),
  );
  const attributes = table.columns
    .filter((column) => !column.foreignKey && !inheritedColumnIds.has(column.id) && !componentColumnIds.has(column.id))
    .map((column) => columnToAttribute(table, column));
  attributes.push(...composites.map(compositeMetadataToAttribute));
  const expectedIdentifierName = `id_${toIdentifier(table.name)}`;
  const hasTechnicalIdentifier = attributes.some(
    (attribute) => attribute.identifier && attribute.name === expectedIdentifierName && attribute.type === 'uuid',
  );

  if (!hasTechnicalIdentifier) {
    attributes.unshift(technicalIdentifier(table));
  }

  return {
    id: table.id,
    name: toIdentifier(table.name),
    attributes,
  };
}

function compositeMetadataToAttribute(metadata: LogicalConversionCompositeAttribute): Attribute {
  return {
    id: metadata.id,
    name: metadata.name,
    type: metadata.type,
    identifier: false,
    required: metadata.required,
    unique: metadata.unique,
    multivalued: false,
    composite: true,
    derived: false,
    components: metadata.components.map(({ id, name, type }) => ({ id, name, type })),
  };
}

function columnToAttribute(table: LogicalTable, column: LogicalColumn): Attribute {
  const identifier = column.primaryKey;
  const expectedIdentifierName = `id_${toIdentifier(table.name)}`;
  const isTechnicalIdentifier = identifier && column.name === expectedIdentifierName && column.type === 'uuid';

  return {
    id: column.id,
    name: isTechnicalIdentifier || identifier ? expectedIdentifierName : column.name,
    type: identifier ? 'uuid' : mapColumnType(column.type),
    identifier,
    required: identifier || column.required || column.nullable === false,
    unique: identifier || column.unique,
    multivalued: false,
    composite: false,
    derived: false,
    components: [],
  };
}

function technicalIdentifier(table: LogicalTable): Attribute {
  const name = `id_${toIdentifier(table.name)}`;
  return {
    id: `${table.id}_${name}`,
    name,
    type: 'uuid',
    identifier: true,
    required: true,
    unique: true,
    multivalued: false,
    composite: false,
    derived: false,
    components: [],
  };
}

function generalizationRelationships(generalizations: Map<string, Generalization>): Relationship[] {
  return [...generalizations.values()].map((generalization) => ({
    id: `gen_${generalization.supertypeTableId}`,
    name: 'generalizacao',
    type: '1:N',
    kind: 'generalization',
    participants: [],
    attributes: [],
    supertypeId: generalization.supertypeTableId,
    subtypeIds: generalization.subtypeTableIds,
    subtypeHandles: {},
  }));
}

function associativeRelationships(
  tables: LogicalTable[],
  associativeTables: Set<string>,
  entityIds: Set<string>,
  relationshipMetadata: LogicalConversionRelationship[],
): Relationship[] {
  return tables.flatMap((table) => {
    if (!associativeTables.has(table.id)) return [];

    const foreignKeys = table.columns.filter((column) => column.foreignKey && column.primaryKey && column.references);
    const [firstForeignKey, secondForeignKey] = foreignKeys;
    if (
      !firstForeignKey?.references ||
      !secondForeignKey?.references ||
      !entityIds.has(firstForeignKey.references.tableId) ||
      !entityIds.has(secondForeignKey.references.tableId)
    ) {
      return [];
    }
    const associationRelationshipMetadata = relationshipMetadata.find(
      (relationship) => relationship.type === 'N:N' && relationship.associationTableId === table.id,
    );

    return [
      {
        id: associationRelationshipMetadata?.id ?? `rel_${table.id}`,
        name: associationRelationshipMetadata?.name ?? 'associa',
        type: 'N:N',
        kind: 'relationship' as const,
        participants: [
          { entityId: firstForeignKey.references.tableId, cardinality: 'N' as const },
          { entityId: secondForeignKey.references.tableId, cardinality: 'N' as const },
        ],
        attributes: table.columns
          .filter((column) => !column.foreignKey)
          .map((column) => columnToRelationshipAttribute(table, column)),
        subtypeIds: [],
        subtypeHandles: {},
      },
    ];
  });
}

function foreignKeyRelationships(
  tables: LogicalTable[],
  associativeTables: Set<string>,
  inheritanceColumnIds: Set<string>,
  entityIds: Set<string>,
  relationshipMetadata: LogicalConversionRelationship[],
): Relationship[] {
  return tables.flatMap((table) => {
    if (associativeTables.has(table.id)) return [];

    return table.columns.flatMap((column) => {
      if (
        !column.foreignKey ||
        !column.references ||
        inheritanceColumnIds.has(column.id) ||
        !entityIds.has(column.references.tableId)
      ) {
        return [];
      }

      const oneToOne = column.unique;
      const metadata = relationshipMetadata.find(
        (relationship) =>
          relationship.type === (oneToOne ? '1:1' : '1:N') &&
          relationship.foreignKeyTableId === table.id &&
          relationship.referencedTableId === column.references?.tableId,
      );
      return [
        {
          id: metadata?.id ?? `rel_${table.id}_${column.id}`,
          name: metadata?.name ?? (oneToOne ? 'associa' : 'relaciona'),
          type: oneToOne ? ('1:1' as const) : ('1:N' as const),
          kind: 'relationship' as const,
          participants: [
            { entityId: column.references.tableId, cardinality: '1' as const },
            { entityId: table.id, cardinality: oneToOne ? ('1' as const) : ('N' as const) },
          ],
          attributes: [],
          subtypeIds: [],
          subtypeHandles: {},
        },
      ];
    });
  });
}

function columnToRelationshipAttribute(table: LogicalTable, column: LogicalColumn): Attribute {
  return {
    ...columnToAttribute(table, column),
    identifier: false,
    unique: column.unique,
  };
}

function mapColumnType(type: LogicalColumn['type']): AttributeType {
  const typeMap: Record<LogicalColumn['type'], AttributeType> = {
    varchar: 'string',
    text: 'text',
    integer: 'number',
    bigint: 'number',
    decimal: 'decimal',
    boolean: 'boolean',
    date: 'date',
    datetime: 'datetime',
    timestamp: 'datetime',
    uuid: 'uuid',
    unknown: 'unknown',
  };

  return typeMap[type];
}

function toIdentifier(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase();
}

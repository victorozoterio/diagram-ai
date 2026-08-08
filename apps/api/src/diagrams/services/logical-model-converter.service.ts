import { Injectable } from '@nestjs/common';

import { Attribute, ConceptualModel, Entity, Relationship } from '../schemas/conceptual-model.schema';
import { LogicalColumn, LogicalColumnType, LogicalModel, LogicalTable } from '../schemas/logical-model.schema';

@Injectable()
export class LogicalModelConverterService {
  convert(conceptualModel: ConceptualModel): LogicalModel {
    const tables = conceptualModel.entities.map((entity) => this.entityToTable(entity));

    for (const table of tables) {
      this.ensurePrimaryKey(table);
    }

    this.applyOneToOneRelationships(tables, conceptualModel.relationships);

    this.applyOneToManyRelationships(tables, conceptualModel.relationships);

    this.applyManyToManyRelationships(tables, conceptualModel.relationships);

    this.applyMultivaluedAttributes(tables, conceptualModel.entities);

    return { tables };
  }

  private entityToTable(entity: Entity): LogicalTable {
    const columns = entity.attributes.flatMap((attribute) => this.attributeToColumns(entity, attribute));

    return {
      id: entity.id,
      name: entity.name,
      columns,
    };
  }

  private attributeToColumns(entity: Entity, attribute: Attribute): LogicalColumn[] {
    if (attribute.composite && attribute.components.length > 0) {
      return attribute.components.map((component) => ({
        id: `${entity.id}_${component.id}`,
        name: component.name,
        type: this.mapAttributeType(component.type),
        primaryKey: false,
        foreignKey: false,
        required: attribute.required,
        unique: false,
      }));
    }

    if (attribute.multivalued || attribute.derived) {
      return [];
    }

    return [
      {
        id: attribute.id,
        name: attribute.name,
        type: this.mapAttributeType(attribute.type),
        primaryKey: attribute.identifier,
        foreignKey: false,
        required: attribute.required,
        unique: attribute.unique,
      },
    ];
  }

  private applyOneToOneRelationships(tables: LogicalTable[], relationships: Relationship[]): void {
    const oneToOneRelationships = relationships.filter((relationship) => relationship.type === '1:1');

    for (const relationship of oneToOneRelationships) {
      const [firstParticipant, secondParticipant] = relationship.participants;

      if (!firstParticipant || !secondParticipant) {
        continue;
      }

      const firstTable = this.findTable(tables, firstParticipant.entityId);

      const secondTable = this.findTable(tables, secondParticipant.entityId);

      if (!firstTable || !secondTable) {
        continue;
      }

      const firstPrimaryKey = this.ensurePrimaryKey(firstTable);

      this.addOrPromoteForeignKey({
        targetTable: secondTable,
        referencedTable: firstTable,
        referencedColumn: firstPrimaryKey,
        unique: true,
      });
    }
  }

  private applyOneToManyRelationships(tables: LogicalTable[], relationships: Relationship[]): void {
    const oneToManyRelationships = relationships.filter((relationship) => relationship.type === '1:N');

    for (const relationship of oneToManyRelationships) {
      const oneSide = relationship.participants.find((participant) => participant.cardinality === '1');

      const manySide = relationship.participants.find((participant) => participant.cardinality === 'N');

      if (!oneSide || !manySide) {
        continue;
      }

      const oneTable = this.findTable(tables, oneSide.entityId);

      const manyTable = this.findTable(tables, manySide.entityId);

      if (!oneTable || !manyTable) {
        continue;
      }

      const onePrimaryKey = this.ensurePrimaryKey(oneTable);

      this.addOrPromoteForeignKey({
        targetTable: manyTable,
        referencedTable: oneTable,
        referencedColumn: onePrimaryKey,
        unique: false,
      });
    }
  }

  private applyManyToManyRelationships(tables: LogicalTable[], relationships: Relationship[]): void {
    const manyToManyRelationships = relationships.filter((relationship) => relationship.type === 'N:N');

    for (const relationship of manyToManyRelationships) {
      const [firstParticipant, secondParticipant] = relationship.participants;

      if (!firstParticipant || !secondParticipant) {
        continue;
      }

      const firstTable = this.findTable(tables, firstParticipant.entityId);

      const secondTable = this.findTable(tables, secondParticipant.entityId);

      if (!firstTable || !secondTable) {
        continue;
      }

      const firstPrimaryKey = this.ensurePrimaryKey(firstTable);
      const secondPrimaryKey = this.ensurePrimaryKey(secondTable);

      const associativeTable: LogicalTable = {
        id: relationship.id,
        name: this.toPascalCase(relationship.name),
        columns: [
          this.createForeignKeyColumn({
            id: `${relationship.id}_${firstTable.id}_id`,
            name: `${firstTable.id}Id`,
            referencedTable: firstTable,
            referencedColumn: firstPrimaryKey,
            primaryKey: true,
          }),
          this.createForeignKeyColumn({
            id: `${relationship.id}_${secondTable.id}_id`,
            name: `${secondTable.id}Id`,
            referencedTable: secondTable,
            referencedColumn: secondPrimaryKey,
            primaryKey: true,
          }),
          ...relationship.attributes.flatMap((attribute) =>
            this.attributeToColumns(
              {
                id: relationship.id,
                name: relationship.name,
                attributes: [],
              },
              attribute,
            ),
          ),
        ],
      };

      tables.push(associativeTable);
    }
  }

  private applyMultivaluedAttributes(tables: LogicalTable[], entities: Entity[]): void {
    for (const entity of entities) {
      const table = this.findTable(tables, entity.id);

      if (!table) {
        continue;
      }

      const primaryKey = this.ensurePrimaryKey(table);

      const multivaluedAttributes = entity.attributes.filter((attribute) => attribute.multivalued);

      for (const attribute of multivaluedAttributes) {
        const multivaluedTable: LogicalTable = {
          id: `${entity.id}_${attribute.id}`,
          name: `${entity.name}${this.toPascalCase(attribute.name)}`,
          columns: [
            {
              id: `${entity.id}_${attribute.id}_id`,
              name: 'id',
              type: 'uuid',
              primaryKey: true,
              foreignKey: false,
              required: true,
              unique: true,
            },
            this.createForeignKeyColumn({
              id: `${entity.id}_${attribute.id}_${entity.id}_id`,
              name: `${entity.id}Id`,
              referencedTable: table,
              referencedColumn: primaryKey,
            }),
            {
              id: attribute.id,
              name: attribute.name,
              type: this.mapAttributeType(attribute.type),
              primaryKey: false,
              foreignKey: false,
              required: attribute.required,
              unique: attribute.unique,
            },
          ],
        };

        tables.push(multivaluedTable);
      }
    }
  }

  private addOrPromoteForeignKey({
    targetTable,
    referencedTable,
    referencedColumn,
    unique,
  }: {
    targetTable: LogicalTable;
    referencedTable: LogicalTable;
    referencedColumn: LogicalColumn;
    unique: boolean;
  }): void {
    const expectedId = `${targetTable.id}_${referencedTable.id}_id`;
    const expectedName = `${referencedTable.id}Id`;

    const existingColumn = this.findExistingForeignKeyCandidate(targetTable, referencedTable, expectedId, expectedName);

    if (existingColumn) {
      existingColumn.type = referencedColumn.type;
      existingColumn.foreignKey = true;
      existingColumn.required = true;
      existingColumn.unique = unique;
      existingColumn.references = {
        tableId: referencedTable.id,
        columnId: referencedColumn.id,
      };

      return;
    }

    targetTable.columns.push(
      this.createForeignKeyColumn({
        id: expectedId,
        name: expectedName,
        referencedTable,
        referencedColumn,
        unique,
      }),
    );
  }

  private createForeignKeyColumn({
    id,
    name,
    referencedTable,
    referencedColumn,
    primaryKey = false,
    unique = false,
    required = true,
  }: {
    id: string;
    name: string;
    referencedTable: LogicalTable;
    referencedColumn: LogicalColumn;
    primaryKey?: boolean;
    unique?: boolean;
    required?: boolean;
  }): LogicalColumn {
    return {
      id,
      name,
      type: referencedColumn.type,
      primaryKey,
      foreignKey: true,
      required,
      unique,
      references: {
        tableId: referencedTable.id,
        columnId: referencedColumn.id,
      },
    };
  }

  private ensurePrimaryKey(table: LogicalTable): LogicalColumn {
    const existingPrimaryKey = this.findPrimaryKey(table);

    if (existingPrimaryKey) {
      return existingPrimaryKey;
    }

    const idColumn: LogicalColumn = {
      id: `${table.id}_id`,
      name: 'id',
      type: 'uuid',
      primaryKey: true,
      foreignKey: false,
      required: true,
      unique: true,
    };

    table.columns.unshift(idColumn);

    return idColumn;
  }

  private findExistingForeignKeyCandidate(
    targetTable: LogicalTable,
    referencedTable: LogicalTable,
    expectedId: string,
    expectedName: string,
  ): LogicalColumn | undefined {
    const normalizedExpectedName = this.normalizeColumnName(expectedName);

    const normalizedReferencedTableId = this.normalizeColumnName(referencedTable.id);

    const normalizedReferencedTableName = this.normalizeColumnName(referencedTable.name);

    return targetTable.columns.find((column) => {
      if (column.id === expectedId) {
        return true;
      }

      const normalizedColumnName = this.normalizeColumnName(column.name);

      return (
        normalizedColumnName === normalizedExpectedName ||
        normalizedColumnName === `${normalizedReferencedTableId}id` ||
        normalizedColumnName === `${normalizedReferencedTableName}id`
      );
    });
  }

  private normalizeColumnName(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]/g, '')
      .toLowerCase();
  }

  private findTable(tables: LogicalTable[], tableId: string): LogicalTable | undefined {
    return tables.find((table) => table.id === tableId);
  }

  private findPrimaryKey(table: LogicalTable): LogicalColumn | undefined {
    return table.columns.find((column) => column.primaryKey);
  }

  private mapAttributeType(type: Attribute['type']): LogicalColumnType {
    const typeMap: Record<Attribute['type'], LogicalColumnType> = {
      string: 'varchar',
      number: 'integer',
      boolean: 'boolean',
      date: 'date',
      datetime: 'timestamp',
      text: 'text',
      decimal: 'decimal',
      uuid: 'uuid',
      email: 'varchar',
      phone: 'varchar',
      unknown: 'unknown',
    };

    return typeMap[type];
  }

  private toPascalCase(value: string): string {
    return value
      .replace(/[_-]+/g, ' ')
      .replace(/\s+(.)/g, (_, character: string) => character.toUpperCase())
      .replace(/^(.)/, (_, character: string) => character.toUpperCase())
      .replace(/\s/g, '');
  }
}

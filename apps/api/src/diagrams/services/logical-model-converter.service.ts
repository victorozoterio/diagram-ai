import { Injectable } from '@nestjs/common';
import { ConceptualModel } from '../schemas/conceptual-model.schema';
import { LogicalModel } from '../schemas/logical-model.schema';
import { ensurePrimaryKey } from './logical-model-converter/logical-column.utils';
import { applyRelationshipConversions } from './logical-model-converter/relationship-converters';
import { applyMultivaluedAttributes, convertEntitiesToTables } from './logical-model-converter/table-converters';

/**
 * Orquestra a conversão do modelo conceitual.
 * As regras de mapeamento vivem em funções puras no diretório adjacente.
 */
@Injectable()
export class LogicalModelConverterService {
  convert(conceptualModel: ConceptualModel): LogicalModel {
    const tables = convertEntitiesToTables(conceptualModel.entities);

    tables.forEach(ensurePrimaryKey);
    applyRelationshipConversions(tables, conceptualModel.relationships);
    applyMultivaluedAttributes(tables, conceptualModel.entities);

    return { tables };
  }
}

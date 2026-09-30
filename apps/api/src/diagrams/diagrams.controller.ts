import { Body, Controller, Post } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { GenerateDiagramDto } from './dto/generate-diagram.dto';
import { AnalyzeAmbiguitiesDto } from './dto/analyze-ambiguities.dto';
import { GenerateSqlDto } from './dto/generate-sql.dto';
import { ConceptualModel } from './schemas/conceptual-model.schema';
import { LogicalModel } from './schemas/logical-model.schema';
import { DiagramsService } from './services/diagrams.service';

@ApiTags('Diagrams')
@Controller('diagrams')
export class DiagramsController {
  constructor(private readonly diagramsService: DiagramsService) {}

  @Post('generate')
  @ApiOperation({
    summary: 'Gera um modelo conceitual ou lógico a partir de uma descrição textual',
    description:
      'Recebe uma descrição em linguagem natural e utiliza IA para gerar o modelo correspondente ao modo informado.',
  })
  @ApiBody({
    type: GenerateDiagramDto,
  })
  @ApiResponse({
    status: 201,
    description: 'Modelo conceitual gerado com sucesso.',
  })
  @ApiResponse({
    status: 400,
    description: 'Descrição inválida ou modelo conceitual gerado fora do schema esperado.',
  })
  generate(@Body() dto: GenerateDiagramDto) {
    return this.diagramsService.generate(dto);
  }

  @Post('analyze-ambiguities')
  @ApiOperation({
    summary: 'Identifica ambiguidades estruturais antes da geração do modelo',
    description: 'Analisa a descrição com IA e retorna apenas perguntas que podem alterar a estrutura do modelo.',
  })
  @ApiBody({ type: AnalyzeAmbiguitiesDto })
  @ApiResponse({ status: 201, description: 'Análise de ambiguidades concluída.' })
  analyzeAmbiguities(@Body() dto: AnalyzeAmbiguitiesDto) {
    return this.diagramsService.analyzeAmbiguities(dto);
  }

  @Post('convert-to-logical')
  @ApiOperation({
    summary: 'Converte um modelo conceitual em modelo lógico',
    description:
      'Recebe um modelo conceitual validado e aplica regras determinísticas para convertê-lo em um modelo lógico com tabelas, colunas, chaves primárias, chaves estrangeiras e tabelas associativas.',
  })
  @ApiBody({
    description: 'Modelo conceitual que será convertido para modelo lógico.',
    schema: {
      example: {
        metadata: {
          title: 'Sistema de Pedidos',
          description: 'Modelo conceitual para controle de clientes e pedidos',
          sourceText: 'Um cliente pode realizar vários pedidos. Cada pedido pertence a apenas um cliente.',
          generatedBy: 'Qwen/Qwen2.5-7B-Instruct',
          generatedAt: '2026-07-29T00:25:34.716Z',
        },
        entities: [
          {
            id: 'cliente',
            name: 'Cliente',
            description: 'Pessoa que realiza pedidos no sistema',
            attributes: [
              {
                id: 'id_cliente',
                name: 'id_cliente',
                type: 'uuid',
                description: 'Identificador único do cliente',
                identifier: true,
                required: true,
                unique: true,
                multivalued: false,
                composite: false,
                derived: false,
                components: [],
              },
              {
                id: 'nome',
                name: 'nome',
                type: 'string',
                description: 'Nome do cliente',
                identifier: false,
                required: true,
                unique: false,
                multivalued: false,
                composite: false,
                derived: false,
                components: [],
              },
            ],
          },
          {
            id: 'pedido',
            name: 'Pedido',
            description: 'Pedido realizado por um cliente',
            attributes: [
              {
                id: 'id_pedido',
                name: 'id_pedido',
                type: 'uuid',
                description: 'Identificador único do pedido',
                identifier: true,
                required: true,
                unique: true,
                multivalued: false,
                composite: false,
                derived: false,
                components: [],
              },
              {
                id: 'data',
                name: 'data',
                type: 'date',
                description: 'Data do pedido',
                identifier: false,
                required: true,
                unique: false,
                multivalued: false,
                composite: false,
                derived: false,
                components: [],
              },
            ],
          },
        ],
        relationships: [
          {
            id: 'cliente_realiza_pedido',
            name: 'realiza',
            description: 'Um cliente pode realizar vários pedidos e cada pedido pertence a apenas um cliente',
            type: '1:N',
            participants: [
              {
                entityId: 'cliente',
                role: 'cliente que realiza pedidos',
                cardinality: '1',
              },
              {
                entityId: 'pedido',
                role: 'pedido realizado por um cliente',
                cardinality: 'N',
              },
            ],
            attributes: [],
          },
        ],
        ambiguities: [],
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Modelo lógico gerado com sucesso.',
  })
  @ApiResponse({
    status: 400,
    description: 'Modelo conceitual inválido.',
  })
  convertToLogical(@Body() conceptualModel: ConceptualModel) {
    return this.diagramsService.convertToLogical(conceptualModel);
  }

  @Post('convert-to-conceptual')
  @ApiOperation({
    summary: 'Converte um modelo lógico em modelo conceitual Chen',
    description:
      'Recebe um modelo lógico validado e reconstrói deterministicamente entidades, relacionamentos, cardinalidades e generalizações quando a estrutura for inequívoca.',
  })
  @ApiResponse({
    status: 201,
    description: 'Modelo conceitual gerado com sucesso.',
  })
  @ApiResponse({
    status: 400,
    description: 'Modelo lógico inválido.',
  })
  convertToConceptual(@Body() logicalModel: LogicalModel) {
    return this.diagramsService.convertToConceptual(logicalModel);
  }

  @Post('generate-sql')
  @ApiOperation({
    summary: 'Gera SQL determinístico a partir do modelo lógico',
  })
  @ApiResponse({ status: 201, description: 'SQL gerado com sucesso.' })
  @ApiResponse({ status: 400, description: 'Dialeto ou modelo lógico inválido.' })
  generateSql(@Body() dto: GenerateSqlDto) {
    return {
      dialect: dto.dialect,
      sql: this.diagramsService.generateSql(dto.model, dto.dialect),
    };
  }
}

import { Module } from '@nestjs/common';

import { AiModule } from '../ai/ai.module';
import { DiagramsController } from './diagrams.controller';
import { DiagramsService } from './services/diagrams.service';
import { LogicalModelConverterService } from './services/logical-model-converter.service';
import { LogicalToConceptualConverterService } from './services/logical-to-conceptual-converter.service';
import { SqlGeneratorService } from './services/sql-generator.service';

@Module({
  imports: [AiModule],
  controllers: [DiagramsController],
  providers: [DiagramsService, LogicalModelConverterService, LogicalToConceptualConverterService, SqlGeneratorService],
})
export class DiagramsModule {}

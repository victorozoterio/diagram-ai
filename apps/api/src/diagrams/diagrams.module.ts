import { Module } from '@nestjs/common';

import { AiModule } from '../ai/ai.module';
import { DiagramsController } from './diagrams.controller';
import { DiagramsService } from './services/diagrams.service';
import { LogicalModelConverterService } from './services/logical-model-converter.service';

@Module({
  imports: [AiModule],
  controllers: [DiagramsController],
  providers: [DiagramsService, LogicalModelConverterService],
})
export class DiagramsModule {}

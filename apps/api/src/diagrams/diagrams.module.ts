import { Module } from '@nestjs/common';

import { AiModule } from '../ai/ai.module';
import { AuthModule } from '../auth/auth.module';
import { SpeechToTextModule } from '../speech/speech-to-text.module';
import { DiagramProjectsController } from './diagram-projects.controller';
import { DiagramsController } from './diagrams.controller';
import { DiagramProjectsService } from './services/diagram-projects.service';
import { DiagramsService } from './services/diagrams.service';
import { LogicalModelConverterService } from './services/logical-model-converter.service';
import { LogicalToConceptualConverterService } from './services/logical-to-conceptual-converter.service';
import { SqlGeneratorService } from './services/sql-generator.service';

@Module({
  imports: [AiModule, AuthModule, SpeechToTextModule],
  controllers: [DiagramsController, DiagramProjectsController],
  providers: [
    DiagramsService,
    DiagramProjectsService,
    LogicalModelConverterService,
    LogicalToConceptualConverterService,
    SqlGeneratorService,
  ],
})
export class DiagramsModule {}

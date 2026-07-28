import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { DiagramsController } from './diagrams.controller';
import { DiagramsService } from './diagrams.service';

@Module({
  imports: [AiModule],
  controllers: [DiagramsController],
  providers: [DiagramsService],
})
export class DiagramsModule {}

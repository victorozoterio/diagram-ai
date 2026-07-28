import { Module } from '@nestjs/common';
import { DiagramsModule } from './diagrams/diagrams.module';
import { AiModule } from './ai/ai.module';

@Module({
  imports: [DiagramsModule, AiModule],
})
export class AppModule {}

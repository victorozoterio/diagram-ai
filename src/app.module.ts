import { Module } from '@nestjs/common';
import { DiagramsModule } from './diagrams/diagrams.module';

@Module({
  imports: [DiagramsModule],
})
export class AppModule {}

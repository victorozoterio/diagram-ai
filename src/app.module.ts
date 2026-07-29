import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AiModule } from './ai/ai.module';
import { envConfig } from './config/environments';
import { DiagramsModule } from './diagrams/diagrams.module';

@Module({
  imports: [ConfigModule.forRoot(envConfig), DiagramsModule, AiModule],
})
export class AppModule {}

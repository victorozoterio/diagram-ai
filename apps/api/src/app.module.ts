import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AiModule } from './ai/ai.module';
import { AuthModule } from './auth/auth.module';
import { envConfig } from './config/environments';
import { DiagramsModule } from './diagrams/diagrams.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [ConfigModule.forRoot(envConfig), PrismaModule, AuthModule, DiagramsModule, AiModule],
})
export class AppModule {}

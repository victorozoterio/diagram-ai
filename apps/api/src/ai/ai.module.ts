import { Module } from '@nestjs/common';
import { AiService } from './ai.service';
import { OllamaProvider } from './providers/ollama.provider';

@Module({
  providers: [AiService, OllamaProvider],
  exports: [AiService],
})
export class AiModule {}

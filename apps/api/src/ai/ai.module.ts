import { Module } from '@nestjs/common';
import { AiService } from './ai.service';
import { HuggingFaceProvider } from './providers/hugging-face.provider';

@Module({
  providers: [AiService, HuggingFaceProvider],
  exports: [AiService],
})
export class AiModule {}

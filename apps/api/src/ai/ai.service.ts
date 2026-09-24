import { Injectable } from '@nestjs/common';
import { OllamaProvider } from './providers/ollama.provider';

@Injectable()
export class AiService {
  constructor(private readonly ollamaProvider: OllamaProvider) {}

  async generateConceptualModel(description: string) {
    return this.ollamaProvider.generateConceptualModel(description);
  }

  async generateLogicalModel(description: string) {
    return this.ollamaProvider.generateLogicalModel(description);
  }

  async fixConceptualModel(params: { description: string; invalidModel: unknown; validationError: unknown }) {
    return this.ollamaProvider.fixConceptualModel(params);
  }
}

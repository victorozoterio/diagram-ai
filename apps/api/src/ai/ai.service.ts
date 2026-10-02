import { Injectable } from '@nestjs/common';
import type { ClarificationAnswer } from './ambiguity-analysis.schema';
import { OllamaProvider } from './providers/ollama.provider';

@Injectable()
export class AiService {
  constructor(private readonly ollamaProvider: OllamaProvider) {}

  async analyzeAmbiguities(description: string) {
    return this.ollamaProvider.analyzeAmbiguities(description);
  }

  async generateConceptualModel(description: string, clarifications?: ClarificationAnswer[]) {
    return this.ollamaProvider.generateConceptualModel(description, clarifications);
  }

  async generateLogicalModel(description: string, clarifications?: ClarificationAnswer[]) {
    return this.ollamaProvider.generateLogicalModel(description, clarifications);
  }

  async fixLogicalModel(params: {
    description: string;
    invalidModel: unknown;
    validationError: unknown;
    clarifications?: ClarificationAnswer[];
  }) {
    return this.ollamaProvider.fixLogicalModel(params);
  }

  async fixConceptualModel(params: {
    description: string;
    invalidModel: unknown;
    validationError: unknown;
    clarifications?: ClarificationAnswer[];
  }) {
    return this.ollamaProvider.fixConceptualModel(params);
  }
}

import { Injectable } from '@nestjs/common';

import { HuggingFaceProvider } from './providers/hugging-face.provider';

@Injectable()
export class AiService {
  constructor(private readonly huggingFaceProvider: HuggingFaceProvider) {}

  async generateConceptualModel(description: string) {
    return this.huggingFaceProvider.generateConceptualModel(description);
  }

  async fixConceptualModel(params: { description: string; invalidModel: unknown; validationError: unknown }) {
    return this.huggingFaceProvider.fixConceptualModel(params);
  }
}

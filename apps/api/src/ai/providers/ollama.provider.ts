import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ENV, EnvironmentVariables } from 'src/config/environments';
import { ConceptualModel, ConceptualModelJsonSchema } from '../../diagrams/schemas/conceptual-model.schema';
import { buildConceptualModelPrompt } from '../prompts/conceptual-model.prompt';
import { buildFixConceptualModelPrompt } from './ollama/conceptual-model-prompts';
import { parseConceptualModelResponse } from './ollama/conceptual-model-response.parser';
import { OllamaChatMessage, OllamaChatResponse } from './ollama/ollama.types';

@Injectable()
export class OllamaProvider {
  private readonly baseUrl: string;
  private readonly model: string;

  constructor(private readonly configService: ConfigService<EnvironmentVariables, true>) {
    this.baseUrl = this.configService.getOrThrow(ENV.OLLAMA_BASE_URL);
    this.model = this.configService.getOrThrow(ENV.OLLAMA_MODEL);
  }

  async generateConceptualModel(description: string): Promise<ConceptualModel> {
    try {
      const content = await this.chat([
        {
          role: 'system',
          content: 'Gere somente o objeto solicitado e respeite rigorosamente o schema de saída.',
        },
        { role: 'user', content: buildConceptualModelPrompt({ description }) },
      ]);

      return this.withGenerationMetadata(parseConceptualModelResponse(content), description);
    } catch (error) {
      throw new InternalServerErrorException({
        message: 'Erro ao gerar modelo conceitual com Ollama.',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async fixConceptualModel(params: {
    description: string;
    invalidModel: unknown;
    validationError: unknown;
  }): Promise<ConceptualModel> {
    try {
      const content = await this.chat([
        {
          role: 'system',
          content: 'Corrija somente os problemas do modelo informado e respeite rigorosamente o schema de saída.',
        },
        { role: 'user', content: buildFixConceptualModelPrompt(params) },
      ]);

      return this.withGenerationMetadata(parseConceptualModelResponse(content), params.description);
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Erro ao corrigir modelo conceitual com Ollama.');
    }
  }

  private withGenerationMetadata(model: ConceptualModel, sourceText: string): ConceptualModel {
    return {
      ...model,
      metadata: {
        ...model.metadata,
        sourceText,
        generatedBy: this.model,
        generatedAt: new Date().toISOString(),
      },
    };
  }

  private async chat(messages: OllamaChatMessage[]): Promise<string> {
    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.model,
        messages,
        format: ConceptualModelJsonSchema,
        stream: false,
        options: {
          temperature: 0,
          num_ctx: 8192,
          num_predict: 2048,
          repeat_penalty: 1.15,
          repeat_last_n: 256,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama respondeu com HTTP ${response.status}: ${await response.text()}`);
    }

    const data = (await response.json()) as OllamaChatResponse;
    if (data.done_reason === 'length') {
      throw new Error('A resposta do Ollama atingiu o limite máximo de tokens.');
    }

    if (!data.message?.content) {
      throw new Error('A IA não retornou conteúdo.');
    }

    return data.message.content;
  }
}

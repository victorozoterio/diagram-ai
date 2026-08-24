import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ENV, EnvironmentVariables } from 'src/config/environments';
import { ZodError } from 'zod';
import {
  ConceptualModel,
  ConceptualModelJsonSchema,
  ConceptualModelSchema,
} from '../../diagrams/schemas/conceptual-model.schema';
import { buildConceptualModelPrompt } from '../prompts/conceptual-model.prompt';

type OllamaChatResponse = {
  message?: {
    role: string;
    content: string;
  };

  done?: boolean;
  done_reason?: string;

  total_duration?: number;
  load_duration?: number;

  prompt_eval_count?: number;
  prompt_eval_duration?: number;

  eval_count?: number;
  eval_duration?: number;
};

type ChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

@Injectable()
export class OllamaProvider {
  private readonly baseUrl: string;
  private readonly model: string;

  constructor(private readonly configService: ConfigService<EnvironmentVariables, true>) {
    this.baseUrl = this.configService.getOrThrow(ENV.OLLAMA_BASE_URL);
    this.model = this.configService.getOrThrow(ENV.OLLAMA_MODEL);
  }

  async generateConceptualModel(description: string): Promise<ConceptualModel> {
    const prompt = buildConceptualModelPrompt({
      description,
    });

    try {
      const content = await this.chat([
        {
          role: 'system',
          content: 'Gere somente o objeto solicitado e respeite rigorosamente o schema de saída.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ]);

      const model = this.parseConceptualModel(content);

      const result: ConceptualModel = {
        ...model,

        metadata: {
          ...model.metadata,

          sourceText: description,
          generatedBy: this.model,
          generatedAt: new Date().toISOString(),
        },
      };

      return result;
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
    const prompt = this.buildFixPrompt(params);

    try {
      const content = await this.chat([
        {
          role: 'system',
          content: 'Corrija somente os problemas do modelo informado e respeite rigorosamente o schema de saída.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ]);

      const model = this.parseConceptualModel(content);

      const result: ConceptualModel = {
        ...model,

        metadata: {
          ...model.metadata,

          sourceText: params.description,
          generatedBy: this.model,
          generatedAt: new Date().toISOString(),
        },
      };

      return result;
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Erro ao corrigir modelo conceitual com Ollama.');
    }
  }

  private async chat(messages: ChatMessage[]): Promise<string> {
    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',

      headers: {
        'Content-Type': 'application/json',
      },

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
      const body = await response.text();

      throw new Error(`Ollama respondeu com HTTP ${response.status}: ${body}`);
    }

    const data = (await response.json()) as OllamaChatResponse;

    if (data.done_reason === 'length') {
      throw new Error('A resposta do Ollama atingiu o limite máximo de tokens.');
    }

    const content = data.message?.content;

    if (!content) {
      throw new Error('A IA não retornou conteúdo.');
    }

    return content;
  }

  private parseConceptualModel(content: string): ConceptualModel {
    const cleanedContent = content
      .replace(/```json/g, '')
      .replace(/```/g, '')
      .trim();

    let parsed: unknown;

    try {
      parsed = JSON.parse(cleanedContent);
    } catch {
      throw new Error('A resposta da IA não é um JSON válido.');
    }

    try {
      return ConceptualModelSchema.parse(parsed);
    } catch (error) {
      if (error instanceof ZodError) {
        console.error('[OLLAMA] schema validation error:', error.issues);
      }

      throw error;
    }
  }

  private buildFixPrompt(params: { description: string; invalidModel: unknown; validationError: unknown }): string {
    return `
O modelo conceitual abaixo falhou na validação.

Corrija apenas os problemas indicados.

DESCRIÇÃO ORIGINAL:
${params.description}

MODELO:
${JSON.stringify(params.invalidModel)}

ERROS:
${JSON.stringify(params.validationError)}

REGRAS:
- Preserve os dados corretos.
- Não invente novas informações sem necessidade.
- Corrija campos ausentes ou inválidos.
- Só use identifier ou unique quando houver evidência.
- Preserve a semântica original da descrição.
`.trim();
  }
}

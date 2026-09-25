import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { ENV, EnvironmentVariables } from 'src/config/environments';

import type { ConceptualModel } from '../../diagrams/schemas/conceptual-model.schema';
import type { LogicalModel } from '../../diagrams/schemas/logical-model.schema';

import { buildConceptualModelPrompt } from '../prompts/conceptual-model.prompt';
import { buildLogicalModelPrompt } from '../prompts/logical-model.prompt';
import { GeneratedConceptualModelJsonSchema } from './ollama/conceptual-model-generation.schema';
import { buildFixConceptualModelPrompt } from './ollama/conceptual-model-prompts';
import {
  compactConceptualModelForRepair,
  parseConceptualModelResponse,
} from './ollama/conceptual-model-response.parser';
import { GeneratedLogicalModelJsonSchema } from './ollama/logical-model-generation.schema';
import { parseLogicalModelResponse } from './ollama/logical-model-response.parser';
import { OllamaError, serializeOllamaError } from './ollama/ollama.errors';
import type { OllamaChatMessage, OllamaChatResponse } from './ollama/ollama.types';

const OLLAMA_TIMEOUT_MS = 120_000;

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
          content: 'Modele DER Chen. Retorne somente o JSON compacto solicitado, sem explicações.',
        },
        {
          role: 'user',
          content: buildConceptualModelPrompt({ description }),
        },
      ]);

      return this.withGenerationMetadata(parseConceptualModelResponse(content, description), description);
    } catch (error) {
      throw this.providerException('Erro ao gerar modelo conceitual com Ollama.', error);
    }
  }

  async generateLogicalModel(description: string): Promise<LogicalModel> {
    try {
      const content = await this.chat(
        [
          {
            role: 'system',
            content: 'Modele um esquema relacional. Retorne somente o JSON solicitado, sem explicações.',
          },
          {
            role: 'user',
            content: buildLogicalModelPrompt({ description }),
          },
        ],
        GeneratedLogicalModelJsonSchema,
      );

      return parseLogicalModelResponse(content, description);
    } catch (error) {
      throw this.providerException('Erro ao gerar modelo lógico com Ollama.', error);
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
          content: 'Corrija o DER Chen. Retorne somente o JSON compacto solicitado, sem explicações.',
        },
        {
          role: 'user',
          content: buildFixConceptualModelPrompt({
            ...params,
            invalidModel: compactConceptualModelForRepair(params.invalidModel),
          }),
        },
      ]);

      return this.withGenerationMetadata(parseConceptualModelResponse(content, params.description), params.description);
    } catch (error) {
      throw this.providerException('Erro ao corrigir modelo conceitual com Ollama.', error);
    }
  }

  private withGenerationMetadata(model: ConceptualModel, sourceText: string): ConceptualModel {
    return {
      ...model,
      metadata: {
        sourceText,
        generatedBy: this.model,
        generatedAt: new Date().toISOString(),
      },
    };
  }

  private async chat(
    messages: OllamaChatMessage[],
    format: unknown = GeneratedConceptualModelJsonSchema,
  ): Promise<string> {
    const controller = new AbortController();
    let timedOut = false;
    const timeout = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, OLLAMA_TIMEOUT_MS);

    try {
      const response = await this.fetchChat(messages, format, controller.signal, () => timedOut);
      return await this.readStreamingResponse(response, () => timedOut);
    } finally {
      clearTimeout(timeout);
    }
  }

  private async fetchChat(
    messages: OllamaChatMessage[],
    format: unknown,
    signal: AbortSignal,
    didTimeOut: () => boolean,
  ): Promise<Response> {
    try {
      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.model,
          messages,
          format,
          stream: true,
          think: false,
          keep_alive: '10m',
          options: {
            temperature: 0,
            num_ctx: 4096,
            num_predict: 1536,
            repeat_penalty: 1.05,
          },
        }),
      });

      if (!response.ok) {
        const detail = await readHttpError(response);
        const code = response.status >= 500 ? 'generation_failed' : 'http_error';
        throw new OllamaError(code, `Ollama respondeu com HTTP ${response.status}: ${detail}`);
      }

      return response;
    } catch (error) {
      if (error instanceof OllamaError) {
        throw error;
      }
      if (didTimeOut() || isAbortError(error)) {
        throw new OllamaError('timeout', `Ollama excedeu o limite de ${OLLAMA_TIMEOUT_MS / 1000}s.`, {
          cause: error,
        });
      }
      throw new OllamaError('connection_failed', 'Falha ao conectar ou enviar a requisição ao Ollama.', {
        cause: error,
      });
    }
  }

  private async readStreamingResponse(response: Response, didTimeOut: () => boolean): Promise<string> {
    if (!response.body) {
      throw new OllamaError('stream_interrupted', 'Ollama respondeu sem um corpo de resposta.');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let content = '';
    let finalChunk: OllamaChatResponse | undefined;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          const chunk = parseStreamChunk(line);
          if (!chunk) continue;
          if (chunk.error) {
            throw new OllamaError('generation_failed', `Ollama interrompeu a geração: ${chunk.error}`);
          }
          content += chunk.message?.content ?? '';
          if (chunk.done) finalChunk = chunk;
        }
      }

      const lastChunk = parseStreamChunk(buffer);
      if (lastChunk) {
        if (lastChunk.error) {
          throw new OllamaError('generation_failed', `Ollama interrompeu a geração: ${lastChunk.error}`);
        }
        content += lastChunk.message?.content ?? '';
        if (lastChunk.done) finalChunk = lastChunk;
      }
    } catch (error) {
      if (error instanceof OllamaError) throw error;
      if (didTimeOut() || isAbortError(error)) {
        throw new OllamaError('timeout', `Ollama excedeu o limite de ${OLLAMA_TIMEOUT_MS / 1000}s.`, {
          cause: error,
        });
      }
      throw new OllamaError('stream_interrupted', 'A resposta do Ollama foi encerrada antes de ser concluída.', {
        cause: error,
      });
    }

    if (!finalChunk) {
      throw new OllamaError('stream_interrupted', 'A resposta do Ollama terminou sem confirmação de conclusão.');
    }
    if (finalChunk.done_reason === 'length') {
      throw new OllamaError('token_limit', 'A resposta do Ollama atingiu o limite máximo de tokens.');
    }
    if (!content.trim()) {
      throw new OllamaError('invalid_response', 'A IA concluiu a geração sem retornar conteúdo.');
    }

    logGenerationMetrics(this.model, finalChunk);
    return content;
  }

  private providerException(message: string, error: unknown): InternalServerErrorException {
    return new InternalServerErrorException(
      {
        message,
        ollama: serializeOllamaError(error),
      },
      { cause: error instanceof Error ? error : undefined },
    );
  }
}

function parseStreamChunk(line: string): OllamaChatResponse | undefined {
  const trimmedLine = line.trim();
  if (!trimmedLine) return undefined;

  try {
    return JSON.parse(trimmedLine) as OllamaChatResponse;
  } catch (error) {
    throw new OllamaError('invalid_response', 'Ollama retornou um fragmento JSON inválido.', { cause: error });
  }
}

async function readHttpError(response: Response): Promise<string> {
  const body = await response.text();
  try {
    const parsed = JSON.parse(body) as { error?: string };
    return parsed.error ?? (body || 'erro sem detalhes');
  } catch {
    return body || 'erro sem detalhes';
  }
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}

function logGenerationMetrics(model: string, response: OllamaChatResponse): void {
  const durationSeconds = response.total_duration ? response.total_duration / 1_000_000_000 : undefined;
  const tokensPerSecond =
    response.eval_count && response.eval_duration
      ? response.eval_count / (response.eval_duration / 1_000_000_000)
      : undefined;

  console.info('[OLLAMA] geração concluída', {
    model,
    durationSeconds,
    promptTokens: response.prompt_eval_count,
    outputTokens: response.eval_count,
    tokensPerSecond,
    doneReason: response.done_reason,
  });
}

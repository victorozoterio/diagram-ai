import { InferenceClient } from '@huggingface/inference';
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ENV, EnvironmentVariables } from 'src/config/environments';
import { buildConceptualModelPrompt } from '../prompts/conceptual-model.prompt';

@Injectable()
export class HuggingFaceProvider {
  private readonly client: InferenceClient;
  private readonly model: string;

  constructor(private readonly configService: ConfigService<EnvironmentVariables, true>) {
    const token = this.configService.getOrThrow(ENV.HUGGING_FACE_TOKEN);
    this.model = this.configService.getOrThrow(ENV.HUGGING_FACE_MODEL);
    this.client = new InferenceClient(token);
  }

  async generateConceptualModel(description: string) {
    const prompt = buildConceptualModelPrompt({
      description,
      model: this.model,
    });

    try {
      const response = await this.client.chatCompletion({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: 'Você responde apenas com JSON válido. Nunca use markdown, explicações ou texto fora do JSON.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.1,
        max_tokens: 3000,
      });

      const content = response.choices[0]?.message?.content;

      if (!content) {
        throw new Error('A IA não retornou conteúdo.');
      }

      return this.parseJsonResponse(content);
    } catch (error) {
      throw new InternalServerErrorException({
        message: 'Erro ao gerar modelo conceitual com Hugging Face.',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async fixConceptualModel(params: { description: string; invalidModel: unknown; validationError: unknown }) {
    const prompt = this.buildFixPrompt(params);

    try {
      const response = await this.client.chatCompletion({
        model: this.model,
        messages: [
          {
            role: 'system',
            content:
              'Você corrige objetos JSON para que sigam exatamente o schema solicitado. Responda apenas com JSON válido, sem markdown e sem explicações.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.1,
        max_tokens: 3000,
      });

      const content = response.choices[0]?.message?.content;

      if (!content) {
        throw new Error('A IA não retornou conteúdo ao tentar corrigir o JSON.');
      }

      return this.parseJsonResponse(content);
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Erro ao corrigir modelo conceitual com Hugging Face.');
    }
  }

  private buildFixPrompt(params: { description: string; invalidModel: unknown; validationError: unknown }): string {
    return `
    Corrija o JSON abaixo para que ele represente um modelo conceitual válido.

    DESCRIÇÃO ORIGINAL DO USUÁRIO:
    ${params.description}

    JSON INVÁLIDO:
    ${JSON.stringify(params.invalidModel, null, 2)}

    ERROS DE VALIDAÇÃO:
    ${JSON.stringify(params.validationError, null, 2)}

    REGRAS:
    - Retorne apenas JSON válido.
    - Não use markdown.
    - Não escreva explicações.
    - Preserve ao máximo as entidades, atributos e relacionamentos já identificados.
    - Corrija apenas o que estiver fora do schema.
    - O campo "type" dos relacionamentos deve usar exatamente: "1:1", "1:N" ou "N:N".
    - O campo "cardinality" dos participantes deve usar exatamente: "1" ou "N".
    - Todos os arrays obrigatórios devem existir.
    - Todos os atributos devem possuir "components": [] quando não forem compostos.
    - Todos os relacionamentos devem possuir "attributes": [] quando não tiverem atributos próprios.
    `;
  }

  private parseJsonResponse(content: string) {
    const cleanedContent = content
      .replace(/```json/g, '')
      .replace(/```/g, '')
      .trim();

    try {
      return JSON.parse(cleanedContent);
    } catch {
      throw new Error('A resposta da IA não é um JSON válido.');
    }
  }
}

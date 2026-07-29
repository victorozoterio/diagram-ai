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

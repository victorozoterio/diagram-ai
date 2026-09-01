import { ZodError } from 'zod';
import { ConceptualModel, ConceptualModelSchema } from '../../../diagrams/schemas/conceptual-model.schema';

/** Valida a resposta textual do provedor antes de ela entrar no domínio da aplicação. */
export function parseConceptualModelResponse(content: string): ConceptualModel {
  const cleanedContent = content.replaceAll('```json', '').replaceAll('```', '').trim();

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

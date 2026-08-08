import type { ConceptualModel } from '../features/diagrams/types/conceptual-model';
import type { LogicalModel } from '../features/diagrams/types/logical-model';

const API_URL = import.meta.env.VITE_API_URL;

export async function generateConceptualModel(description: string): Promise<ConceptualModel> {
  const response = await fetch(`${API_URL}/diagrams/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ description }),
  });

  if (!response.ok) {
    throw new Error('Não foi possível gerar o modelo conceitual.');
  }

  return response.json();
}

export async function convertToLogicalModel(conceptualModel: ConceptualModel): Promise<LogicalModel> {
  const response = await fetch(`${API_URL}/diagrams/convert-to-logical`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(conceptualModel),
  });

  if (!response.ok) {
    throw new Error('Não foi possível converter o modelo conceitual para lógico.');
  }

  return response.json();
}

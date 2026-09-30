import type { ConceptualModel } from '../features/diagrams/types/conceptual-model';
import type { LogicalModel } from '../features/diagrams/types/logical-model';

export const SQL_DIALECTS = ['postgresql', 'mysql', 'mariadb', 'sqlserver'] as const;
export type SqlDialect = (typeof SQL_DIALECTS)[number];

export type ClarificationAnswer = {
  questionId: string;
  answers: string[];
};

export type AmbiguityQuestion = {
  id: string;
  text: string;
  options: string[];
  allowsMultipleSelection: boolean;
  allowsCustomAnswer: boolean;
};

export type AmbiguityAnalysis = {
  requiresClarification: boolean;
  questions: AmbiguityQuestion[];
};

const API_URL = import.meta.env.VITE_API_URL;

export async function generateConceptualModel(
  description: string,
  clarifications?: ClarificationAnswer[],
): Promise<ConceptualModel> {
  const response = await fetch(`${API_URL}/diagrams/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ description, clarifications }),
  });

  if (!response.ok) {
    throw new Error('Não foi possível gerar o modelo conceitual.');
  }

  return response.json();
}

export async function generateLogicalModel(
  description: string,
  clarifications?: ClarificationAnswer[],
): Promise<LogicalModel> {
  const response = await fetch(`${API_URL}/diagrams/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ description, mode: 'logical', clarifications }),
  });

  if (!response.ok) {
    throw new Error('Não foi possível gerar o modelo lógico.');
  }

  return response.json();
}

export async function analyzeAmbiguities(description: string): Promise<AmbiguityAnalysis> {
  const response = await fetch(`${API_URL}/diagrams/analyze-ambiguities`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ description }),
  });

  if (!response.ok) {
    throw new Error('Não foi possível analisar ambiguidades na descrição.');
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

export async function convertToConceptualModel(logicalModel: LogicalModel): Promise<ConceptualModel> {
  const response = await fetch(`${API_URL}/diagrams/convert-to-conceptual`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(logicalModel),
  });

  if (!response.ok) {
    throw new Error('Não foi possível converter o modelo conceitual.');
  }

  return response.json();
}

export async function generateSql(dialect: SqlDialect, model: LogicalModel): Promise<string> {
  const response = await fetch(`${API_URL}/diagrams/generate-sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ dialect, model }),
  });

  if (!response.ok) {
    throw new Error('Não foi possível gerar o SQL.');
  }

  const payload = (await response.json()) as { sql: string };
  return payload.sql;
}

import type { ConceptualModel } from '../features/diagrams/types/conceptual-model';
import { type DiagramAiDocument, parseDiagramAiDocument } from '../features/diagrams/types/diagram-ai-project';
import type { LogicalModel } from '../features/diagrams/types/logical-model';

export const SQL_DIALECTS = ['postgresql', 'mysql', 'mariadb', 'sqlserver'] as const;
export type SqlDialect = (typeof SQL_DIALECTS)[number];

export type ClarificationAnswer = {
  questionId: string;
  answers: string[];
  questionText?: string;
  kind?: 'cardinality' | 'structural';
  cardinality?: {
    participants: [{ entity: string; cardinality: '1' | 'N' }, { entity: string; cardinality: '1' | 'N' }];
  };
};

export type AmbiguityQuestion = {
  id: string;
  text: string;
  kind?: 'cardinality' | 'structural';
  participants?: [string, string];
  options: string[];
  optionIds?: string[];
  optionCardinalities?: Array<{ optionIndex: number; cardinality: NonNullable<ClarificationAnswer['cardinality']> }>;
  allowsMultipleSelection: boolean;
  allowsCustomAnswer: boolean;
};

export type AmbiguityAnalysis = {
  requiresClarification: boolean;
  questions: AmbiguityQuestion[];
};

export type DiagramSummary = {
  id: string;
  name: string;
  content: DiagramAiDocument;
  createdAt: string;
  updatedAt: string;
};

export type SavedDiagram = DiagramSummary;

const API_URL = import.meta.env.VITE_API_URL;

const requestOptions = {
  credentials: 'include' as const,
};

type ApiErrorBody = {
  code?: unknown;
  message?: unknown;
  issues?: unknown;
};

export class DiagramApiError extends Error {
  readonly code?: string;
  readonly issues?: unknown;

  constructor(message: string, code?: string, issues?: unknown) {
    super(message);
    this.name = 'DiagramApiError';
    this.code = code;
    this.issues = issues;
  }
}

async function requestError(response: Response, fallbackMessage: string): Promise<DiagramApiError> {
  let payload: ApiErrorBody | undefined;
  try {
    payload = (await response.json()) as ApiErrorBody;
  } catch {
    // A resposta pode vir vazia em falhas de infraestrutura.
  }

  const baseMessage = typeof payload?.message === 'string' ? payload.message : fallbackMessage;
  const issueMessages = Array.isArray(payload?.issues)
    ? payload.issues
        .map((issue) =>
          typeof issue === 'object' && issue !== null && typeof issue.message === 'string' ? issue.message : null,
        )
        .filter((message): message is string => Boolean(message))
    : [];
  const message =
    issueMessages.length > 0 ? `${baseMessage}\n${issueMessages.map((issue) => `• ${issue}`).join('\n')}` : baseMessage;
  const code = typeof payload?.code === 'string' ? payload.code : undefined;
  return new DiagramApiError(message, code, payload?.issues);
}

export async function transcribeAudio(audio: Blob): Promise<string> {
  const formData = new FormData();
  formData.append('audio', audio, 'descricao.webm');

  const response = await fetch(`${API_URL}/diagrams/transcribe-audio`, {
    ...requestOptions,
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw await requestError(response, 'Não foi possível transcrever o áudio. Tente novamente.');
  }

  const result = (await response.json()) as { text?: unknown };
  if (typeof result.text !== 'string' || !result.text.trim()) {
    throw new Error('Não foi possível identificar fala no áudio gravado.');
  }

  return result.text;
}

export async function generateConceptualModel(
  description: string,
  clarifications?: ClarificationAnswer[],
): Promise<ConceptualModel> {
  const response = await fetch(`${API_URL}/diagrams/generate`, {
    ...requestOptions,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ description, clarifications }),
  });

  if (!response.ok) {
    throw await requestError(response, 'Não foi possível gerar o modelo conceitual.');
  }

  return response.json();
}

export async function generateLogicalModel(
  description: string,
  clarifications?: ClarificationAnswer[],
): Promise<LogicalModel> {
  const response = await fetch(`${API_URL}/diagrams/generate`, {
    ...requestOptions,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ description, mode: 'logical', clarifications }),
  });

  if (!response.ok) {
    throw await requestError(response, 'Não foi possível gerar o modelo lógico.');
  }

  return response.json();
}

export async function analyzeAmbiguities(description: string): Promise<AmbiguityAnalysis> {
  const response = await fetch(`${API_URL}/diagrams/analyze-ambiguities`, {
    ...requestOptions,
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
    ...requestOptions,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(conceptualModel),
  });

  if (!response.ok) {
    throw await requestError(response, 'Não foi possível converter o modelo conceitual para lógico.');
  }

  return response.json();
}

export async function convertToConceptualModel(logicalModel: LogicalModel): Promise<ConceptualModel> {
  const response = await fetch(`${API_URL}/diagrams/convert-to-conceptual`, {
    ...requestOptions,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(logicalModel),
  });

  if (!response.ok) {
    throw await requestError(response, 'Não foi possível converter o modelo conceitual.');
  }

  return response.json();
}

export async function generateSql(dialect: SqlDialect, model: LogicalModel): Promise<string> {
  const response = await fetch(`${API_URL}/diagrams/generate-sql`, {
    ...requestOptions,
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

export async function createDiagram(name: string | undefined, content: DiagramAiDocument): Promise<SavedDiagram> {
  const response = await fetch(`${API_URL}/diagrams/projects`, {
    ...requestOptions,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...(name ? { name } : {}), content }),
  });

  if (!response.ok) throw new Error('Não foi possível salvar o diagrama na nuvem.');
  return parseSavedDiagram(await response.json());
}

export async function updateDiagram(id: string, name: string, content: DiagramAiDocument): Promise<SavedDiagram> {
  const response = await fetch(`${API_URL}/diagrams/projects/${encodeURIComponent(id)}`, {
    ...requestOptions,
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, content }),
  });

  if (!response.ok) throw new Error('Não foi possível salvar as alterações na nuvem.');
  return parseSavedDiagram(await response.json());
}

export async function listDiagrams(): Promise<DiagramSummary[]> {
  const response = await fetch(`${API_URL}/diagrams/projects`, requestOptions);
  if (!response.ok) throw new Error('Não foi possível listar os diagramas salvos.');
  const payload = await response.json();
  if (!Array.isArray(payload)) throw new Error('A lista de diagramas possui um formato inválido.');
  return payload.map(parseSavedDiagram);
}

export async function getDiagram(id: string): Promise<SavedDiagram> {
  const response = await fetch(`${API_URL}/diagrams/projects/${encodeURIComponent(id)}`, requestOptions);
  if (!response.ok) throw new Error('Não foi possível abrir o diagrama salvo.');
  return parseSavedDiagram(await response.json());
}

export async function renameDiagram(id: string, name: string): Promise<SavedDiagram> {
  const response = await fetch(`${API_URL}/diagrams/projects/${encodeURIComponent(id)}`, {
    ...requestOptions,
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });

  if (!response.ok) throw new Error('Não foi possível renomear o diagrama.');
  return parseSavedDiagram(await response.json());
}

export async function deleteDiagram(id: string): Promise<void> {
  const response = await fetch(`${API_URL}/diagrams/projects/${encodeURIComponent(id)}`, {
    ...requestOptions,
    method: 'DELETE',
  });

  if (!response.ok) throw new Error('Não foi possível excluir o diagrama.');
}

function parseSavedDiagram(value: unknown): SavedDiagram {
  if (!isSavedDiagram(value)) throw new Error('O diagrama salvo possui um formato inválido.');

  return {
    ...value,
    content: parseDiagramAiDocument(value.content),
  };
}

function isSavedDiagram(value: unknown): value is Omit<SavedDiagram, 'content'> & { content: unknown } {
  if (!value || typeof value !== 'object') return false;

  const diagram = value as Record<string, unknown>;
  return (
    typeof diagram.id === 'string' &&
    typeof diagram.name === 'string' &&
    typeof diagram.createdAt === 'string' &&
    typeof diagram.updatedAt === 'string' &&
    'content' in diagram
  );
}

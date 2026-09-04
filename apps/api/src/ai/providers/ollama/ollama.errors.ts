export type OllamaErrorCode =
  | 'timeout'
  | 'connection_failed'
  | 'http_error'
  | 'generation_failed'
  | 'stream_interrupted'
  | 'token_limit'
  | 'invalid_response';

export class OllamaError extends Error {
  constructor(
    readonly code: OllamaErrorCode,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = 'OllamaError';
  }
}

export function serializeOllamaError(error: unknown): Record<string, unknown> {
  if (!(error instanceof Error)) {
    return { message: String(error) };
  }

  return {
    code: error instanceof OllamaError ? error.code : 'unknown',
    name: error.name,
    message: error.message,
    cause: serializeCause(error.cause),
  };
}

function serializeCause(cause: unknown): unknown {
  if (cause instanceof Error) {
    const causeWithCode = cause as Error & { code?: string };
    return {
      name: cause.name,
      message: cause.message,
      code: causeWithCode.code,
      cause: serializeCause(cause.cause),
    };
  }

  if (cause && typeof cause === 'object') {
    const value = cause as Record<string, unknown>;
    return {
      message: value.message,
      code: value.code,
      errno: value.errno,
      syscall: value.syscall,
      address: value.address,
      port: value.port,
    };
  }

  return cause;
}

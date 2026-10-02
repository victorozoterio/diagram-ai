import { ConfigModuleOptions } from '@nestjs/config';
import { z } from 'zod';

const optionalEnvironmentString = z.preprocess(
  (value) => (typeof value === 'string' && !value.trim() ? undefined : value),
  z.string().min(1).optional(),
);

const envSchema = z
  .object({
    // Environment
    PORT: z.coerce.number().default(3000),

    // Database
    DATABASE_URL: z.url(),

    // Authentication
    BETTER_AUTH_URL: z.url(),
    BETTER_AUTH_SECRET: z.string().min(32),
    WEB_APP_URL: z.url().default('http://localhost:5173'),
    GOOGLE_CLIENT_ID: optionalEnvironmentString,
    GOOGLE_CLIENT_SECRET: optionalEnvironmentString,
    GITHUB_CLIENT_ID: optionalEnvironmentString,
    GITHUB_CLIENT_SECRET: optionalEnvironmentString,

    // Ollama
    OLLAMA_BASE_URL: z.string().min(1),
    OLLAMA_MODEL: z.string().min(1),

    // Whisper
    WHISPER_CPP_BINARY_PATH: z.string().min(1).optional(),
    WHISPER_CPP_MODEL_PATH: z.string().min(1).optional(),
    WHISPER_CPP_LANGUAGE: z.string().min(1).default('pt'),
    FFMPEG_BINARY_PATH: z.string().min(1).default('ffmpeg'),
    SPEECH_TO_TEXT_TIMEOUT_MS: z.coerce.number().int().positive().default(120_000),
  })
  .superRefine((environment, context) => {
    validateOAuthProviderPair(context, {
      clientId: environment.GOOGLE_CLIENT_ID,
      clientIdKey: 'GOOGLE_CLIENT_ID',
      clientSecret: environment.GOOGLE_CLIENT_SECRET,
      clientSecretKey: 'GOOGLE_CLIENT_SECRET',
      provider: 'Google',
    });
    validateOAuthProviderPair(context, {
      clientId: environment.GITHUB_CLIENT_ID,
      clientIdKey: 'GITHUB_CLIENT_ID',
      clientSecret: environment.GITHUB_CLIENT_SECRET,
      clientSecretKey: 'GITHUB_CLIENT_SECRET',
      provider: 'GitHub',
    });
  });

export type EnvironmentVariables = z.infer<typeof envSchema>;
export const ENV = envSchema.keyof().enum;

export const validateEnvironment = (config: Record<string, string>) => {
  const result = envSchema.safeParse(config);

  if (!result.success) {
    const tree = z.treeifyError(result.error);
    console.error('❌ Invalid environment variables:', tree);
    throw new Error(`Invalid environment variables:\n${z.prettifyError(result.error)}`);
  }

  return result.data;
};

export const envConfig: ConfigModuleOptions = {
  isGlobal: true,
  cache: true,
  envFilePath: ['.env', '.env.local', '.env.dev', '.env.hml', '.env.prd'],
  validate: validateEnvironment,
};

function validateOAuthProviderPair(
  context: z.RefinementCtx,
  params: {
    clientId?: string;
    clientIdKey: string;
    clientSecret?: string;
    clientSecretKey: string;
    provider: string;
  },
) {
  if (Boolean(params.clientId) === Boolean(params.clientSecret)) return;

  context.addIssue({
    code: 'custom',
    message: `${params.provider}: ${params.clientIdKey} e ${params.clientSecretKey} devem ser configuradas juntas.`,
    path: params.clientId ? [params.clientSecretKey] : [params.clientIdKey],
  });
}

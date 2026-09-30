import { ConfigModuleOptions } from '@nestjs/config';
import { z } from 'zod';

const envSchema = z.object({
  // Environment
  PORT: z.coerce.number().default(3000),

  // Database
  DATABASE_URL: z.url(),

  // Authentication
  BETTER_AUTH_URL: z.url(),
  BETTER_AUTH_SECRET: z.string().min(32),
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  GITHUB_CLIENT_ID: z.string().min(1),
  GITHUB_CLIENT_SECRET: z.string().min(1),

  // Ollama
  OLLAMA_BASE_URL: z.string().min(1),
  OLLAMA_MODEL: z.string().min(1),
});

export type EnvironmentVariables = z.infer<typeof envSchema>;
export const ENV = envSchema.keyof().enum;

const validate = (config: Record<string, string>) => {
  const result = envSchema.safeParse(config);

  if (!result.success) {
    const tree = z.treeifyError(result.error);
    console.error('❌ Invalid environment variables:', tree);
    throw new Error('Invalid environment variables');
  }

  return result.data;
};

export const envConfig: ConfigModuleOptions = {
  isGlobal: true,
  cache: true,
  envFilePath: ['.env', '.env.local', '.env.dev', '.env.hml', '.env.prd'],
  validate,
};

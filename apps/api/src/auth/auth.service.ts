import type { IncomingMessage, ServerResponse } from 'node:http';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ENV, type EnvironmentVariables } from '../config/environments';
import { PrismaService } from '../prisma/prisma.service';
import { createAuthOptions } from './auth.options';

type NodeAuthHandler = (request: IncomingMessage, response: ServerResponse) => Promise<void>;

type AuthSession = {
  user: {
    id: string;
    email: string;
    name: string;
  };
};

type BetterAuthInstance = {
  api: {
    getSession: (context: { headers: Headers; query: { disableCookieCache: boolean } }) => Promise<AuthSession | null>;
  };
};

export type SocialProvider = 'google' | 'github';

@Injectable()
export class AuthService implements OnModuleInit {
  private handler?: NodeAuthHandler;
  private auth?: BetterAuthInstance;
  private enabledSocialProviders: SocialProvider[] = [];

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService<EnvironmentVariables, true>,
  ) {}

  async onModuleInit(): Promise<void> {
    const [{ betterAuth }, { prismaAdapter }, { toNodeHandler }] = await Promise.all([
      import('better-auth'),
      import('@better-auth/prisma-adapter'),
      import('better-auth/node'),
    ]);

    const socialProviders = this.configuredSocialProviders();
    const auth = betterAuth({
      database: prismaAdapter(this.prisma, { provider: 'postgresql' }),
      ...createAuthOptions(
        this.configService.getOrThrow(ENV.BETTER_AUTH_SECRET),
        this.configService.getOrThrow(ENV.BETTER_AUTH_URL),
        this.configService.getOrThrow(ENV.WEB_APP_URL),
        socialProviders,
      ),
    });

    this.auth = auth;
    this.handler = toNodeHandler(auth);
    this.enabledSocialProviders = Object.keys(socialProviders) as SocialProvider[];
  }

  async handle(request: IncomingMessage, response: ServerResponse): Promise<void> {
    if (!this.handler) {
      throw new Error('Better Auth ainda não foi inicializado.');
    }

    await this.handler(request, response);
  }

  async getSession(cookie: string | undefined): Promise<AuthSession | null> {
    if (!this.auth) {
      throw new Error('Better Auth ainda não foi inicializado.');
    }

    const headers = new Headers();
    if (cookie) headers.set('cookie', cookie);

    return this.auth.api.getSession({ headers, query: { disableCookieCache: true } });
  }

  getEnabledSocialProviders(): SocialProvider[] {
    return [...this.enabledSocialProviders];
  }

  private configuredSocialProviders(): Partial<Record<SocialProvider, { clientId: string; clientSecret: string }>> {
    const google = this.providerCredentials(ENV.GOOGLE_CLIENT_ID, ENV.GOOGLE_CLIENT_SECRET);
    const github = this.providerCredentials(ENV.GITHUB_CLIENT_ID, ENV.GITHUB_CLIENT_SECRET);

    return {
      ...(google ? { google } : {}),
      ...(github ? { github } : {}),
    };
  }

  private providerCredentials(
    clientIdKey: typeof ENV.GOOGLE_CLIENT_ID | typeof ENV.GITHUB_CLIENT_ID,
    clientSecretKey: typeof ENV.GOOGLE_CLIENT_SECRET | typeof ENV.GITHUB_CLIENT_SECRET,
  ) {
    const clientId = this.configService.get(clientIdKey, { infer: true });
    const clientSecret = this.configService.get(clientSecretKey, { infer: true });
    return clientId && clientSecret ? { clientId, clientSecret } : undefined;
  }
}

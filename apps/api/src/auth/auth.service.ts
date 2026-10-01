import type { IncomingMessage, ServerResponse } from 'node:http';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ENV, type EnvironmentVariables } from '../config/environments';
import { PrismaService } from '../prisma/prisma.service';
import { createAuthOptions } from './auth.options';

type NodeAuthHandler = (request: IncomingMessage, response: ServerResponse) => Promise<void>;

@Injectable()
export class AuthService implements OnModuleInit {
  private handler?: NodeAuthHandler;

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

    const auth = betterAuth({
      database: prismaAdapter(this.prisma, { provider: 'postgresql' }),
      ...createAuthOptions(
        this.configService.getOrThrow(ENV.BETTER_AUTH_SECRET),
        this.configService.getOrThrow(ENV.BETTER_AUTH_URL),
        this.configService.getOrThrow(ENV.WEB_APP_URL),
        {
          google: {
            clientId: this.configService.getOrThrow(ENV.GOOGLE_CLIENT_ID),
            clientSecret: this.configService.getOrThrow(ENV.GOOGLE_CLIENT_SECRET),
          },
          github: {
            clientId: this.configService.getOrThrow(ENV.GITHUB_CLIENT_ID),
            clientSecret: this.configService.getOrThrow(ENV.GITHUB_CLIENT_SECRET),
          },
        },
      ),
    });

    this.handler = toNodeHandler(auth);
  }

  async handle(request: IncomingMessage, response: ServerResponse): Promise<void> {
    if (!this.handler) {
      throw new Error('Better Auth ainda não foi inicializado.');
    }

    await this.handler(request, response);
  }
}

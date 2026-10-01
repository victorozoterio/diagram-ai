import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

export type AuthenticatedUser = {
  id: string;
  email: string;
  name: string;
};

export type AuthenticatedRequest = Request & {
  authenticatedUser?: AuthenticatedUser;
};

export const CurrentUser = createParamDecorator((_: unknown, context: ExecutionContext): AuthenticatedUser => {
  const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
  return request.authenticatedUser as AuthenticatedUser;
});

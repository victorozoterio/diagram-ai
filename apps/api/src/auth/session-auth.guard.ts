import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';
import { AuthService } from './auth.service';
import type { AuthenticatedRequest } from './current-user.decorator';

@Injectable()
export class SessionAuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest & Request>();
    const session = await this.authService.getSession(request.headers.cookie);

    if (!session) {
      throw new UnauthorizedException('Sessão inválida ou expirada.');
    }

    request.authenticatedUser = session.user;
    return true;
  }
}

import type { IncomingMessage, ServerResponse } from 'node:http';
import { All, Controller, Get, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';

@Controller('api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('providers')
  providers() {
    return { providers: this.authService.getEnabledSocialProviders() };
  }

  @All('*path')
  async handle(@Req() request: Request, @Res() response: Response): Promise<void> {
    await this.authService.handle(request as unknown as IncomingMessage, response as unknown as ServerResponse);
  }
}

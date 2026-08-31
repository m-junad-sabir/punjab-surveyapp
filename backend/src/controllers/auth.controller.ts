import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from '../bll/services/auth.service';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  async register(
    @Body()
    body: {
      username: string;
      full_name: string;
      email?: string;
      phone?: string;
      password_hash: string;
      role_id: number;
    },
  ) {
    return this.authService.register(body);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body()
    body: {
      username: string;
      password_hash: string; // the frontend passes password as password_hash or password. We'll standardise.
    },
  ) {
    return this.authService.login(body.username, body.password_hash);
  }
}

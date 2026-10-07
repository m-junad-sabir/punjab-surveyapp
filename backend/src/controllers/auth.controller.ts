import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { AuthService, RegisterDto, LoginDto } from '../bll/services/auth.service';
import { RbacGuard } from '../common/guards/rbac.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/user.decorator';

// ─── Request body shapes ──────────────────────────────────────────────────────

interface RegisterBody {
  username: string;
  full_name: string;
  email?: string;
  phone?: string;
  /** Plain-text password — hashed server-side */
  password: string;
  role_id: number;
}

interface LoginBody {
  username: string;
  /** Plain-text password — compared against bcrypt hash server-side */
  password: string;
}

// ─── Controller ───────────────────────────────────────────────────────────────

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * POST /auth/login
   * Public — no guard needed.
   * Returns JWT + user profile on success.
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() body: LoginBody) {
    const dto: LoginDto = {
      username: body.username,
      password: body.password,
    };
    return this.authService.login(dto);
  }

  /**
   * POST /auth/register
   * Requires USER_MANAGE permission — only DB Admin can create users.
   */
  @Post('register')
  @UseGuards(RbacGuard)
  @RequirePermissions('USER_CREATE')
  async register(@Body() body: RegisterBody) {
    const dto: RegisterDto = {
      username:  body.username,
      full_name: body.full_name,
      email:     body.email,
      phone:     body.phone,
      password:  body.password,
      role_id:   body.role_id,
    };
    return this.authService.register(dto);
  }

  /**
   * GET /auth/users
   * Requires USER_MANAGE permission — lists all users for the admin panel.
   */
  @Get('users')
  @UseGuards(RbacGuard)
  @RequirePermissions('USER_CREATE')
  async listUsers() {
    return this.authService.listUsers();
  }

  /**
   * PATCH /auth/users/:id/status
   * Requires USER_MANAGE — activate or deactivate a user account.
   * Body: { is_active: boolean }
   */
  @Patch('users/:id/status')
  @UseGuards(RbacGuard)
  @RequirePermissions('USER_REMOVE')
  async setUserStatus(
    @Param('id') userId: string,
    @Body() body: { is_active: boolean },
  ) {
    return this.authService.setActiveStatus(userId, body.is_active);
  }

  /**
   * GET /auth/me
   * Any authenticated user — returns their own profile from JWT payload.
   */
  @Get('me')
  @UseGuards(RbacGuard)
  async me(@CurrentUser() user: any) {
    return user;
  }
}

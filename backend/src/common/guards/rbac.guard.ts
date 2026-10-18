import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';

@Injectable()
export class RbacGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly reflector: Reflector,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    // ── Extract Bearer token ────────────────────────────────────────────────
    const authHeader: string | undefined = request.headers['authorization'];
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or malformed Authorization header');
    }

    const token = authHeader.slice(7);

    // ── Verify & decode ─────────────────────────────────────────────────────
    let payload: any;
    try {
      payload = this.jwtService.verify(token);
    } catch {
      throw new UnauthorizedException('Token is invalid or expired');
    }

    // ── Revocation check: deactivated users and bumped token versions ──────
    const rows: Array<{ is_active: boolean; token_version: number }> = await this.dataSource.query(
      'SELECT is_active, token_version FROM users WHERE id = $1',
      [payload.sub],
    );
    const current = rows[0];
    if (!current || !current.is_active || current.token_version !== payload.tv) {
      throw new UnauthorizedException('Session is no longer valid. Please sign in again.');
    }

    // Attach decoded user to request for use in @CurrentUser()
    request.user = payload;

    // ── Permission check ────────────────────────────────────────────────────
    const required: string[] = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    ) ?? [];

    if (required.length === 0) {
      // Route requires authentication only — no specific permission needed
      return true;
    }

    const userPermissions: string[] = payload.permissions ?? [];
    const hasAll = required.every((p) => userPermissions.includes(p));

    if (!hasAll) {
      throw new ForbiddenException(
        `Insufficient permissions. Required: ${required.join(', ')}`,
      );
    }

    return true;
  }
}

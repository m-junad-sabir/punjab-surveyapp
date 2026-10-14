import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';

@Injectable()
export class RbacGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly reflector: Reflector,
  ) {}

  canActivate(context: ExecutionContext): boolean {
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
      payload = this.jwtService.verify(token, {
        secret: process.env.JWT_SECRET || 'punjab-industries-survey-secret-key-2026',
      });
    } catch {
      throw new UnauthorizedException('Token is invalid or expired');
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

# Guards

`rbac.guard.ts` contains `RbacGuard`, the authorization boundary for protected endpoints. It:

1. Reads the Bearer token from `Authorization`.
2. Verifies the JWT using the configured secret.
3. Attaches the decoded user/permission claims to `request.user`.
4. Throws `UnauthorizedException` for missing/invalid tokens.
5. Checks `RequirePermissions` metadata and throws `ForbiddenException` when a permission is absent.

Routes without a `RequirePermissions` decorator still require a valid token when this guard is applied.

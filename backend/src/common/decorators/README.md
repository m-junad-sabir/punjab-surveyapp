# Decorators

- `permissions.decorator.ts` defines `RequirePermissions(...codes)`, which stores required permission metadata on a route.
- `user.decorator.ts` defines `CurrentUser`, which reads the authenticated JWT payload attached to `request.user`.

`RequirePermissions` only declares policy. `RbacGuard` in the sibling `guards/` directory performs the actual check.

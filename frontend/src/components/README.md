# Shared components

- `Layout.tsx` provides the authenticated shell, online/offline indicator, logout action, nested route outlet, navigation, and pending-sync badge.
- `ProtectedRoute.tsx` redirects users without a stored authenticated session to `/login`.

Navigation visibility is permission-aware: review requires `UNIT_APPROVE`, and admin requires `USER_MANAGE`. These UI checks complement, but never replace, backend authorization.

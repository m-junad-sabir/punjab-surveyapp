# React contexts

- `AuthContext.tsx` persists `survey_token` and `survey_user` in `localStorage`, performs login/logout, and exposes `hasPermission`.
- `SurveyContext.tsx` loads/caches the active form, reads local responses, tracks pending responses, and updates online status from browser events.

Wrap the routed application with both providers in `main.tsx`. Components and pages consume these contexts through `useAuth()` and `useSurvey()`, which reject use outside their providers.

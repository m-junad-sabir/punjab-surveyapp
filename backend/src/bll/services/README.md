# Backend services

Each service is injected into one or more controllers and owns a cohesive use case:

| Service | Main responsibility |
|---|---|
| `AuthService` | Register users, verify passwords, load permissions, and sign JWTs |
| `SurveyFormService` | Load the active form with ordered sections/questions and logic |
| `SyncService` | Persist offline response batches and detect likely duplicates |
| `IndustrialUnitService` | Read units and transactionally approve/reject them |

`SyncService` is the main offline API path. It uses the client `response_id` for idempotency, checks proximity/name similarity for duplicates, and writes response, answer, duplicate-flag, and sync-log records.

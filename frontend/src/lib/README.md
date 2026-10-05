# Frontend libraries

## API client

`api.ts` centralizes JSON requests under `/api`, adds the stored `survey_token`, parses backend errors, and exposes typed methods for auth, active-form retrieval, sync, and industrial-unit review:

`auth.login/register`, `form.getActive`, `sync.push`, `units.list/get/approve/reject`.

## Offline storage

`db.ts` opens IndexedDB database `survey-pwa` with `survey_form`, `offline_responses`, and `sync_log` stores. Responses are keyed by client `response_id` and indexed by `sync_status`. `SyncPage` reads pending records, sends them to `/sync`, updates statuses from the batch result, and records a local sync log.

`deviceId.ts` supplies the stable device identifier included in sync payloads. Keep API transport and persistence here so route pages remain focused on user interaction.

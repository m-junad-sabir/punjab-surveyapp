# Controllers

Controllers are the HTTP boundary of the API. They should validate/receive request data, obtain the authenticated user from `CurrentUser`, enforce route permissions with `RbacGuard` and `RequirePermissions`, and delegate business rules to `bll/services`.

## Routes

- `auth.controller.ts`: public `POST /auth/register` and `POST /auth/login`.
- `survey-form.controller.ts`: `GET /survey-forms/active`, requiring `SURVEY_SUBMIT`.
- `sync.controller.ts`: `POST /sync`, requiring `SURVEY_SUBMIT`; the user ID comes from the JWT, not the payload.
- `industrial-unit.controller.ts`: authenticated list/detail routes and `UNIT_APPROVE` approve/reject actions.

Controllers do not write database records directly. Add new behavior to a service and keep the controller as a thin transport adapter.

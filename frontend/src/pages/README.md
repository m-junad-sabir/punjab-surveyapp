# Pages and workflows

`App.tsx` maps these route-level screens:

- `LoginPage`: public login through `AuthContext`.
- `DashboardPage`: local response counts and recent activity.
- `SurveyListPage`: browse, filter, edit, and delete local responses where allowed.
- `SurveyPage`: create/edit form responses, apply validation/conditional logic, and save drafts or pending submissions to IndexedDB.
- `SyncPage`: submit pending responses online and reconcile returned statuses.
- `SupervisorPage`: list industrial units for review.
- `UnitDetailPage`: fetch one unit and approve/reject it with optional remarks.
- `AdminPage`: register users online.

Survey capture is intentionally local-first. A successful form submission here does not mean the server has received it; `SyncPage` performs that second step.

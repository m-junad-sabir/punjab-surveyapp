# Frontend

The frontend is a React 18/Vite progressive web app. It provides authentication, survey capture, local IndexedDB persistence, and an explicit online sync workflow against the backend REST API.

## Application flow

`src/main.tsx` mounts the app. `App.tsx` defines routes and protected layout nesting. `AuthContext` owns JWT/user state, while `SurveyContext` owns form cache, local responses, pending counts, and connectivity. `lib/api.ts` is the single HTTP client and `lib/db.ts` is the offline persistence boundary.

The browser calls `/api/*`; Vite proxies this prefix to the backend during development. Survey responses are first saved locally and are sent to `POST /sync` from `SyncPage` when connectivity is available.

```bash
npm install
npm run dev
```

See `src/lib/README.md`, `src/context/README.md`, and `src/pages/README.md` for request and state details.

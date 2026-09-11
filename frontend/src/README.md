# Frontend source

The frontend source is organized by responsibility:

- `App.tsx` and `main.tsx`: application bootstrap and route tree.
- `components/`: shared layout and authentication boundary.
- `context/`: global authentication and survey/offline state.
- `lib/`: API transport, IndexedDB persistence, and device identity.
- `pages/`: route-level user workflows.
- `types/`: shared TypeScript contracts for API and local state.
- `styles/`: global presentation styles.

The important data path is `pages → context/lib → API or IndexedDB`. Pages should use `lib/api.ts` rather than calling `fetch` directly.

# Punjab Industrial Survey Dashboard

Client-demonstration prototype built with Next.js, React, TypeScript, Leaflet,
Chart.js and Tailwind CSS. All survey figures and records are **synthetic**.
No database connection or credentials are required.

## Run locally

```powershell
npm install
npm run dev
```

Open http://localhost:3000. For a production build, run `npm run build`, then
`npm start`. Run `npm run typecheck` to validate TypeScript.

The app is a static export (`next.config.mjs` uses `output: "export"`), so
`npm run build` writes deployable files to `out/`. Netlify settings live in
`netlify.toml` (build `npm run build`, publish `out`, Node 22) and override
the Netlify UI values.

## Demonstration walkthrough

- Choose a division in the filter bar, click a map district, or select a summary
  row. Coverage indicators, charts, activity and submissions update together.
- Switch the monthly chart between monthly and cumulative counts.
- Expand the map or switch to assigned-unit markers.
- Open Survey Records, search, filter statuses, paginate and inspect a record.
- Export the filtered submission register as CSV.
- Explore the deployment, mapping and reports views using the sidebar.

Date filters apply to submissions and activity only; KPI coverage and trend
fixtures represent the entire demonstration round, as explained in the UI.
Administrative screens are explicitly read-only previews.

## Database alignment and limitations

The supplied PostgreSQL/PostGIS schema is preserved. The synthetic record model
uses `industrial_units` geography, `survey_responses.status`, surveyor identifiers
from `users`, and operation codes from `lookup_values`. Confirmed survey totals
represent distinct units in this fixture; a live implementation must count
distinct `unit_id` for a selected survey round to avoid counting repeat visits.
Awaiting-survey counts are distinct from `PENDING_CONFIRMATION` review status.
Deployment, assignment targets, survey schedule and completeness buckets are
illustrative aggregates, not metrics derived from the supplied database.

`lib/demo-data.ts` is the isolated fixture layer to replace with an authenticated
server-side reporting service. Do not expose PostgreSQL credentials to the client.
Authentication, permissions, editing, live GPS tracking and live administration
are not implemented in this presentation prototype.

## Geography and attribution

The locally bundled district geometry is public-domain geoBoundaries PAK ADM2
(release `9469f09`), sourced via
https://www.geoboundaries.org/api/current/gbOpen/PAK/ADM2/ .
Source dataset: https://github.com/wmgeolab/geoBoundaries .
District boundaries may reflect historical administrative geography.
Division grouping and marker locations are demonstrative, not authoritative.
Online basemap tiles are provided by OpenStreetMap with attribution
shown on the map. Local district geometry and charts work without basemap tiles;
an internet connection is required to load the background basemap.
# StarOpsItemFinder.gethuib.io

Star Ops Item Finder is a Star Citizen-inspired operations console for browsing resources, mining data, crafting records, weapons, armor, locations, and related logistics details.

## Development

Install dependencies:

```bash
npm install
```

Run the full stack in development:

```bash
npm run dev
```

Import external data sources:

```bash
npm run import:sources
```

Build the exported public dataset:

```bash
npm run export:json
```

Development services:

- Frontend: `http://localhost:4173/`
- Backend API: `http://localhost:8787/api/health`

## Production

Build the frontend:

```bash
npm run build
```

Start the backend server, which also serves the built frontend from `dist/`:

```bash
npm start
```

Default backend port: `8787`

## Storage Design

Persistent backend state lives under `server/storage/`.

Storage model:

- Base dataset: `star-ops-master-data.json`
- Persistent state: `server/storage/app-state.json`
- Runtime merge: backend combines the base dataset with admin overrides before serving `/api/dataset`

Persisted records include:

- admin users with salted password hashes
- active admin sessions
- homepage and UI override presets
- ops announcement and verification notes
- audit log entries

The persistent state file is created automatically on first backend start and is ignored by git.

Environment variables:

- `STAROPS_ADMIN_USERNAME`
- `STAROPS_ADMIN_PASSWORD`
- `PORT`
- `REDDIT_CLIENT_ID`
- `REDDIT_CLIENT_SECRET`
- `REDDIT_USERNAME`
- `REDDIT_PASSWORD`
- `REDDIT_USER_AGENT`
- `STAROPS_AUTO_SYNC_ENABLED` (optional, default `true`)
- `STAROPS_AUTO_SYNC_ON_BOOT` (optional, default `false`)

## GitHub Actions Secrets

To enable the scheduled importer workflow with Reddit auth, add these repository secrets in GitHub:

- `REDDIT_CLIENT_ID`
- `REDDIT_CLIENT_SECRET`
- `REDDIT_USERNAME`
- `REDDIT_PASSWORD`
- `REDDIT_USER_AGENT`

If these are missing, the Reddit importer falls back to a skipped result instead of failing the whole pipeline.

## Data Pipeline

Importer and export scripts live under `scripts/`.

- `scripts/import-sources.mjs`: fetches raw source snapshots and writes merged artifacts
- `scripts/export-json.mjs`: converts merged canonical data into `public/star-citizen-data.json`
- `.github/workflows/update-star-citizen-data.yml`: scheduled workflow that refreshes data every 12 hours

Generated artifact paths:

- `data/raw/*.json`
- `data/merged/canonical.json`
- `reports/conflicts.json`
- `reports/failures.json`
- `public/star-citizen-data.json`

## API Endpoints

- `GET /api/health`
- `GET /api/dataset`
- `GET /api/summary`
- `GET /api/entities`
- `GET /api/entities/:type/:id`
- `GET /api/assistant/prompts`
- `POST /api/assistant/query`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/auth/logout`
- `GET /api/admin/state`
- `PUT /api/admin/state`
- `GET /api/admin/users`
- `POST /api/admin/users`
- `PUT /api/admin/users/:id/password`
- `GET /api/admin/storage/export`
- `GET /api/resources`
- `GET /api/armor`
- `GET /api/weapons`
- `GET /api/locations`
- `GET /api/stores`
- `GET /api/blueprints`
- `GET /api/recipes`

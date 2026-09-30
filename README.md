# Presight User Directory

A full-stack user directory with search, nationality/hobby filters, and infinite scroll.

- **client/** — React 19 + Vite + Tailwind, TanStack Query/Virtual
- **server/** — Express 5 API + Knex on SQLite
- npm workspaces managed with Lerna

See [REQUIREMENTS.md](REQUIREMENTS.md) for the exercise spec.

## Prerequisites

- Node.js 20+ and npm
- Docker + Docker Compose (optional, for containerized run)

## Run locally (development)

```bash
npm install
npm start
```

`npm start` runs both workspaces in parallel:

- **API** on http://localhost:3001 — on startup it migrates the database and seeds it if empty (`server/data/presight.sqlite`).
- **Client** on http://localhost:5173 — proxies `/api` to the API.

Open http://localhost:5173.

### Database commands

```bash
npm run db:setup   # migrate + seed only if the users table is empty
npm run db:seed    # migrate + (re)run seeds
```

To start from a fresh database, delete `server/data/presight.sqlite`.

## Run with Docker

```bash
docker compose up --build
```

Open http://localhost:3001 — the server serves both the API and the built client. Data is persisted in the `presight-data` volume (`docker compose down -v` to reset).

## Configuration

| Variable      | Default                       | Description                                  |
|---------------|-------------------------------|----------------------------------------------|
| `PORT`        | `3001`                        | API port (host port in Docker Compose)       |
| `SEED_COUNT`  | `10000`                       | Number of users generated when seeding        |
| `DB_FILE`     | `server/data/presight.sqlite` | SQLite file path (`:memory:` supported)      |
| `CLIENT_DIST` | —                             | If set, the server serves the built client   |
| `API_URL`     | `http://localhost:3001`       | Vite dev proxy target for `/api`             |

## Scripts

| Command             | Description                         |
|---------------------|-------------------------------------|
| `npm start`         | Run client and server in dev mode   |
| `npm run build`     | Build client and server             |
| `npm test`          | Run server tests                    |
| `npm run typecheck` | Type-check all workspaces           |

## API

- `GET /api/health` — health check
- `GET /api/users` — paginated users. Query: `q`, `nationality` (repeatable), `hobby` (repeatable), `sort` (`first_name`, `last_name`, `age`, `nationality`), `order` (`asc`/`desc`), `limit` (1–200, default 50), `offset`
- `GET /api/users/facets` — nationality and hobby counts for the current filters (`q`, `nationality`, `hobby`)

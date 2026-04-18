# Weave

Weave is a **single-user** workspace for tech leads to **understand people and relationships**: a **graph** for **who connects to whom** (structure and navigation) and **notes/tags** for **personal context** that compounds over time. **Command bar** + **React Flow** graph + **context panel**; **Go REST API** (in-memory by default, **optional PostgreSQL** via **`WEAVE_MODE=persist`**) and **React** (Vite) frontend.

**Documentation:** [PRD.md](PRD.md) (product intent, MVP, phases) · [docs/UI.md](docs/UI.md) (UI behaviour: graph, command bar, context panel, keyboard)

---

## Features (current)

- **People** as graph nodes with optional **team** metadata (team is a field, not a separate node type). **`notes`** and lightweight **`tags`** are supported in the context panel (inline editing + autosave).
- **Typed relationships** between people (`works_with`, `reports_to`, `depends_on`, plus custom strings the API accepts).
- **Interactive graph**: Dagre layout, person-style nodes with **team colours**, selection, **hover preview**, **focus dimming**, **focus mode**, **animated active edges**, highlights after create/edit.
- **Command bar**: quick add nodes and edges; forgiving syntax; suggestions with keyboard navigation.
- **Context panel**: edit name, team, notes, and tags; delete node or edge; change edge type; view connections.
- **Dark UI** (Tailwind + small Radix-based components).

Details: **[docs/UI.md](docs/UI.md)**.

---

## Prerequisites

- **Go** 1.23+ (see `backend/go.mod`)
- **Node.js** 20+ and **npm** (for the frontend)
- **Docker** (optional) — for local **PostgreSQL** via Compose (see below)

---

## Local development

1. **Environment** — Copy **`.env.example`** to **`.env`**. **Compose** reads **`POSTGRES_*`**; the **Go API** reads **`DATABASE_URL`** and **`WEAVE_MODE`** only — set **`DATABASE_URL`** to the same user, password, and DB as **`POSTGRES_*`** (e.g. `postgres://ryan:secret@localhost:5432/weave?sslmode=disable`). Do not commit **`.env`**. From **`backend/`**: **`./run-with-env.sh`**, or `set -a && source ../.env && set +a` then **`go run ./cmd/api`**. Without **`WEAVE_MODE=persist`**, the API uses the **in-memory** store.
2. **Database** — Start Postgres with Docker Compose from the repo root:

   ```bash
   docker compose up -d
   ```

   Stop, reset, and `psql` access: **[docs/DEV_DATABASE.md](docs/DEV_DATABASE.md)**.
3. **Backend** — Run the API (see **How to run (development)** below): `cd backend && go run ./cmd/api`. With Postgres, from **`backend/`**: **`./run-with-env.sh`** (loads **`../.env`** then **`go run ./cmd/api`**).
4. **Frontend** — Same section: `cd frontend && npm install && npm run dev`.

---

## How to run (development)

Run the **API** and **frontend** in two terminals. The Vite dev server **proxies** `/graph`, `/nodes`, and `/edges` to `http://localhost:8080`, so you usually do **not** need to set `VITE_API_BASE` locally.

### 1. Backend API

```bash
cd backend
go run ./cmd/api
```

**Postgres / `.env`:** from **`backend/`**, if **`WEAVE_MODE`** and **`DATABASE_URL`** are in the repo-root **`.env`** (after `docker compose up -d`):

```bash
cd backend
./run-with-env.sh
```

The server listens on **port 8080** (see `backend/cmd/api/main.go`). Health check: `GET http://localhost:8080/health`.

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open the URL Vite prints (typically **http://localhost:5173**).

### Useful commands

| Command | Where | Purpose |
|--------|--------|---------|
| `go test ./...` | `backend` | Run Go tests |
| `npm run build` | `frontend` | Production build |
| `npm run lint` | `frontend` | ESLint |

---

## Configuration

### `VITE_API_BASE` (frontend)

The API client uses `import.meta.env.VITE_API_BASE` and defaults to an **empty string** so requests hit the same origin as the app.

- **Local dev:** leave unset; rely on the Vite proxy in `frontend/vite.config.ts`.
- **Production / custom hosting:** build with the API origin, e.g. `VITE_API_BASE=https://api.example.com` so fetches go to that host.

---

## API overview

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Liveness |
| `GET` / `POST` / `PATCH` / `DELETE` | `/nodes` | People CRUD |
| `GET` / `POST` / `PATCH` / `DELETE` | `/edges` | Edges; `PATCH` updates type; `DELETE` removes an edge |
| `GET` | `/graph` | Full `{ nodes, edges }` snapshot |

By default data is **in memory**. With **`WEAVE_MODE=persist`** and a running Postgres (see **Local development**), the API uses **`DATABASE_URL`** and persists nodes and edges in Postgres.

---

## Project structure

```text
weave/
├── PRD.md                 # Product requirements, MVP, phases
├── docker-compose.yml     # Local PostgreSQL (dev)
├── .env.example           # Example env (copy to .env; not committed)
├── docs/
│   ├── UI.md              # Frontend UI (graph, command bar, context panel)
│   └── DEV_DATABASE.md    # Local Postgres via Docker Compose
├── tasks.md               # Historical checklist (may lag PRD §4)
├── README.md              # This file
├── LICENSE                # MIT
├── backend/
│   ├── cmd/api/           # HTTP server entrypoint
│   ├── run-with-env.sh    # Dev: source ../.env then go run ./cmd/api
│   └── internal/          # handlers, models, store (in-memory + optional Postgres)
└── frontend/
    ├── src/
    │   ├── api/           # Fetch helpers for the REST API
    │   ├── components/    # UI primitives + home/details panels
    │   ├── graph/       # React Flow view, nodes, edges, theme
    │   ├── pages/       # Home / main app shell
    │   ├── lib/         # Shared utilities (e.g. cn)
    │   ├── App.tsx
    │   ├── main.tsx
    │   └── index.css    # Tailwind entry
    ├── vite.config.ts   # Dev server + API proxy
    ├── tailwind.config.ts
    └── package.json
```

---

## License

This project is licensed under the **MIT License** — see [LICENSE](LICENSE).

# Weave

Weave is a **single-user** workspace for tech leads to **understand people and relationships**: a **graph** for **who connects to whom** (structure and navigation) and **notes/tags** for **personal context** that compounds over time. **Command bar** + **React Flow** graph + **context panel**; **Go REST API** (in-memory) and **React** (Vite) frontend.

**Documentation:** [PRD.md](PRD.md) (product intent, MVP, phases) · [docs/UI.md](docs/UI.md) (UI behaviour: graph, command bar, context panel, keyboard)

---

## Features (current)

- **People** as graph nodes with optional **team** metadata (team is a field, not a separate node type). **`notes`** and lightweight **`tags`** are supported in the context panel (inline editing + autosave).
- **Typed relationships** between people (`works_with`, `reports_to`, `depends_on`, plus custom strings the API accepts).
- **Interactive graph**: Dagre layout, person-style nodes with **team colours**, selection, **hover preview**, **focus dimming**, **focus mode**, **animated active edges**, highlights after create/edit.
- **Command bar**: quick add nodes and edges; forgiving syntax; suggestions with keyboard navigation.
- **Context panel**: edit name, team, notes, and tags; delete node; change edge type; view connections.
- **Dark UI** (Tailwind + small Radix-based components).

Details: **[docs/UI.md](docs/UI.md)**.

---

## Prerequisites

- **Go** 1.23+ (see `backend/go.mod`)
- **Node.js** 20+ and **npm** (for the frontend)

---

## How to run (development)

Run the **API** and **frontend** in two terminals. The Vite dev server **proxies** `/graph`, `/nodes`, and `/edges` to `http://localhost:8080`, so you usually do **not** need to set `VITE_API_BASE` locally.

### 1. Backend API

```bash
cd backend
go run ./cmd/api
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
| `GET` / `POST` / `PATCH` | `/edges` | Edges; `PATCH` updates edge type |
| `GET` | `/graph` | Full `{ nodes, edges }` snapshot |

Data is stored **in memory** until persistence is added (see PRD).

---

## Project structure

```text
weave/
├── PRD.md                 # Product requirements, MVP, phases
├── docs/
│   └── UI.md              # Frontend UI (graph, command bar, context panel)
├── tasks.md               # Historical checklist (may lag PRD §4)
├── README.md              # This file
├── LICENSE                # MIT
├── backend/
│   ├── cmd/api/           # HTTP server entrypoint
│   └── internal/          # handlers, models, in-memory store
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

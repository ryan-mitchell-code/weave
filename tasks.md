# Weave — Task breakdown (historical)

> **Note:** This file is a **legacy checklist** from early development. **Current shipped status**, MVP scope, and phases are authoritative in **[PRD.md](PRD.md)** (especially **§4 Current status** and **§11 Development phases**). Use **[docs/UI.md](docs/UI.md)** for frontend behaviour.
>
> **Headings** name work areas; **phase numbers** align loosely with PRD §11. There is no single global task ID across phases.

---

## Phase 1: Backend core

### Nodes API

* [x] Create Node model
* [x] Create POST /nodes
* [x] Create GET /nodes

### Edges API

* [x] Create Edge model *(superseded — edges shipped; see PRD)*
* [x] Create POST /edges
* [x] Create GET /edges
* [x] Validate node IDs exist before linking

### Basic graph logic

* [x] Fetch nodes + edges together
* [x] Return graph structure from API

---

## Phase 2: Persistence

### PostgreSQL setup

* [x] Add DB connection (opt-in: **`WEAVE_MODE=persist`**, **`DATABASE_URL`**)
* [x] Create nodes / edges tables (on startup, inline DDL)
* [x] Swappable store: in-memory (default) vs Postgres

---

## Phase 3: Frontend *(largely complete — see PRD §4)*

### Basic UI

* [x] List / visualise nodes *(via graph + context panel)*
* [x] Add node *(command bar + API)*
* [x] Display nodes

### Relationships UI

* [x] Create edge *(command bar)*
* [x] Display relationships *(graph + context panel)*

---

## Phase 4: Graph view

### Graph visualisation

* [x] Integrate React Flow
* [x] Map nodes to graph
* [x] Map edges to connections

---

## Phase 5: AI (future)

Design: **[docs/AI.md](docs/AI.md)** (local-first, search → context → LLM, `POST /ai/query`).

### Provider & config

* [ ] Create AI provider interface (local HTTP client, e.g. Ollama-compatible)
* [ ] Wire config (base URL, model id, timeouts)

### Query pipeline

* [ ] Implement `POST /ai/query` (see docs/AI.md)
* [ ] Reuse search ranking; take top N nodes; build bounded context
* [ ] Send minimal context to local LLM; structured response + fallback to search-only

---

## Shipped from backlog *(was “stretch goals”)*

Items that lived here until they landed in the product; details are in PRD / UI docs.

* [x] Tagging system *(lightweight tags in context panel — see docs/UI.md)*
* [x] Search *(dedicated header search — see docs/UI.md, PRD §13)*
* [x] Keyboard shortcuts *(e.g. Delete on selection — see docs/UI.md)*
* [ ] Local embeddings (optional; still local-only — see docs/AI.md §10)

---

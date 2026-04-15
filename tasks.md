# Weave — Task breakdown (historical)

> **Note:** This file is a **legacy checklist** from early development. **Current shipped status**, MVP scope, and phases are authoritative in **[PRD.md](PRD.md)** (especially **§4 Current status** and **§11 Development phases**). Use **[docs/UI.md](docs/UI.md)** for frontend behaviour.

---

## Phase 1: Backend core

### Task 1: Nodes API

* [x] Create Node model
* [x] Create POST /nodes
* [x] Create GET /nodes

### Task 2: Edges API

* [x] Create Edge model *(superseded — edges shipped; see PRD)*
* [x] Create POST /edges
* [x] Create GET /edges
* [x] Validate node IDs exist before linking

### Task 3: Basic graph logic

* [x] Fetch nodes + edges together
* [x] Return graph structure from API

---

## Phase 2: Persistence

### Task 4: PostgreSQL setup

* [ ] Add DB connection
* [ ] Create nodes table
* [ ] Create edges table
* [ ] Replace in-memory storage

---

## Phase 3: Frontend *(largely complete — see PRD §4)*

### Task 5: Basic UI

* [x] List / visualise nodes *(via graph + context panel)*
* [x] Add node *(command bar + API)*
* [x] Display nodes

### Task 6: Relationships UI

* [x] Create edge *(command bar)*
* [x] Display relationships *(graph + context panel)*

---

## Phase 4: Graph view

### Task 7: Graph visualisation

* [x] Integrate React Flow
* [x] Map nodes to graph
* [x] Map edges to connections

---

## Phase 5: AI (future)

### Task 8: AI abstraction

* [ ] Create AI provider interface
* [ ] Add OpenAI implementation (stub)

### Task 9: AI querying

* [ ] Implement “ask graph” endpoint
* [ ] Retrieve relevant nodes
* [ ] Send minimal context to AI

---

## Stretch goals

* [ ] Tagging system
* [ ] Search
* [x] Keyboard shortcuts *(partial: e.g. Delete on selected node — see docs/UI.md)*
* [ ] Local LLM support

---

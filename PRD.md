# Weave – Product Requirements Document (PRD)

## 1. Overview

Weave is a personal knowledge graph designed to help a tech lead map relationships between people, teams, and systems in a large organisation.

The goal is to make it easy to answer:

* Who can help with X?
* What team owns Y?
* How are these people connected?

---

## 2. Goals

### Primary Goal

Reduce time to identify the right people or teams for a given problem.

### Success Criteria

* Answer “who can help with X?” in < 10 seconds
* Used daily for:

  * meeting prep
  * incident response
  * planning

---

## 3. Current status (April 2026)

The product is past a minimal CRUD demo: it is a **single-user, command-first graph workspace** with a polished dark UI, interactive visualisation, and a right-hand inspector for editing selection.

### Shipped (working end-to-end)

**Backend (Go, REST, in-memory store)**

* **Nodes:** `GET/POST/PATCH/DELETE /nodes` — person nodes with `name`, `team`, `notes` (API field present; UI does not yet edit notes).
* **Edges:** `GET/POST /edges`, `PATCH /edges` (edge **type** update) — links between people; default relationship type when omitted is `works_with`.
* **Graph:** `GET /graph` — combined nodes and edges for the frontend.

**Frontend (React, Vite, React Flow, Tailwind)**

* **Interactive graph:** Dagre layout, selection, focus zoom on selected node, focus mode (selected node + neighbours), edge/node highlight feedback after actions.
* **Command bar:** Quick create for people (`name` + optional `team`) and edges (forgiving syntax: `->`, `to`, or two known names); optional edge type in quick input; suggestions with keyboard navigation.
* **Inspector panel:** Node inline edit (name, team) with auto-save on blur/Enter; delete node (button + Delete key when not typing in an input); edge details with editable relationship type.
* **Visual design:** Dark, high-contrast internal-tool aesthetic; graph styling centralised for easier iteration.

### Intentionally not done yet

* Persistent database (still in-memory only).
* Multi-user auth, sharing, or collaboration.
* Notes/tags editing in the UI; search beyond quick-input matching; AI querying.

---

## 4. Core Concepts

### Nodes

Represents **people** in the organisation.

**Node type (MVP):**

* `person` only — **team is not a separate node type**; it is metadata on the person.

**Fields (as implemented in API):**

* `id`
* `name`
* `type` — always `person` for created nodes
* `team` — optional string (e.g. “Payments”); drives label and graph colouring
* `notes` — optional string (stored; not exposed in current UI)

**Future:** `tags`, richer profiles, non-person entity types if needed.

---

### Edges

Represents **relationships** between people.

**Fields:**

* `id`
* `from_id`, `to_id`
* `type` — relationship label (e.g. `works_with`, `reports_to`, `depends_on`); defaults to `works_with` when not specified on create

---

## 5. MVP scope (revised)

### Backend — MVP baseline

* [x] Create / list / update / delete nodes (person)
* [x] Create / list edges; update edge type
* [x] Single graph snapshot endpoint
* [ ] **Persistence:** move from in-memory to PostgreSQL (next major milestone)

### Frontend — MVP baseline

* [x] Graph visualisation and interaction
* [x] Fast command input for nodes and edges + suggestions
* [x] Inspector for selected node or edge
* [ ] Surface **notes** (and optional **tags**) in UI when product priority is clear

---

## 6. Future features

### Intelligence & discovery

* Natural language or structured “ask the graph” (with strict privacy rules — see §8).
* Auto-tagging, relationship suggestions, richer search and filters (by team, type, path).

### Product depth

* Export/import, backups
* Optional multi-user / shared graphs (explicitly out of scope for now)

---

## 7. Privacy principles

* All core data stored locally (or under the deployer’s control).
* Any future AI receives only **minimal, explicit** context — never the full graph by default.
* AI provider abstraction layer when AI is introduced.

---

## 8. Technical stack

### Backend

* Go (REST API)

### Frontend

* React (Vite), React Flow, Tailwind CSS, Radix-based UI primitives

### Database

* **Current:** in-memory store  
* **Target:** PostgreSQL

### AI (future)

* OpenAI or similar (initial)
* Local models (future)

---

## 9. Development phases (updated)

| Phase | Focus | Status |
|-------|--------|--------|
| 1 | Nodes, edges, graph API; in-memory storage | **Done** |
| 2 | Frontend: graph + command bar + inspector + polish | **Done** |
| 3 | PostgreSQL persistence | **Next** |
| 4 | Richer data in UI (notes, tags), search, export | Planned |
| 5 | AI / NL querying (with privacy guardrails) | Planned |

---

## 10. Non-goals

* Not a full enterprise org-chart product (yet).
* Not multi-user SaaS (yet).
* Not sending the full dataset to third-party AI without explicit, minimal context.

---

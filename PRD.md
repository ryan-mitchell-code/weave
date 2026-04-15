# Weave — Product Requirements Document (PRD)

## 1. Overview

Weave is a **personal relationship intelligence** system for tech leads. It helps you build and query a living map of:

- **Who knows what**
- **Who works with whom**
- **How knowledge flows** through your organisation

The goal is not only to visualise relationships, but to **capture context** and enable fast reasoning about people and work.

---

## 2. Goals

### Primary goal

Reduce the time and uncertainty involved in navigating **people**, **knowledge**, and **ownership** within an organisation.

### Secondary goals

- Build a reliable mental map of people and relationships.
- Capture **context** (notes, tags) that is otherwise lost or fragmented.
- Enable **fast, low-friction updates** during real work (meetings, incidents).

### Success criteria

- Answer **“who can help with X?”** in **under 10 seconds**.
- Answer **“how are these people connected?”** in **under 10 seconds**.
- Add or update graph data in **under 5 seconds** during real workflows.
- Used **daily** for: meeting prep, incident response, planning.

---

## 3. Core user loop

Weave is designed to be used **continuously** alongside daily work.

| Stage | What users do |
|--------|----------------|
| **Capture** | Add people, teams, and relationships quickly via the **command bar**. Add notes and tags during or immediately after interactions (when supported in UI). |
| **Explore** | Navigate the graph visually. Use **hover** and **focus** to understand relationships. |
| **Contextualise** | View notes, tags, and connections for a person; build a richer understanding over time. |
| **Recall** | Quickly answer: who can help? who is connected? what do I know about this person? |

This loop should take **seconds, not minutes**.

---

## 4. Current status (April 2026)

The product is a **single-user, command-first graph workspace** with a polished dark UI, interactive visualisation, and a **context panel** for working with selected items.

**UI behaviour (implemented interactions):** [docs/UI.md](docs/UI.md)

### Shipped (working end-to-end)

#### Backend (Go, REST, in-memory store)

| Area | Details |
|------|---------|
| **Nodes** | `GET` / `POST` / `PATCH` / `DELETE` `/nodes` — person nodes with `name`, `team`, `notes` (notes stored; **not yet editable in UI**). |
| **Edges** | `GET` / `POST` `/edges`, `PATCH` `/edges` — relationship links with **editable type**. |
| **Graph** | `GET` `/graph` — combined nodes and edges for the frontend. |

#### Frontend (React, Vite, React Flow, Tailwind)

| Area | Details |
|------|---------|
| **Interactive graph** | **Dagre** layout (top-to-bottom). **Person-style** nodes with **team colours**. **Selection**, **hover preview**, **focus dimming** (connected component). **Focus mode** (selected node + neighbours). **Subtle animated flow** on active edges. **Highlight** feedback after actions. |
| **Command bar** | Fast creation for nodes and edges; flexible syntax (`->`, `to`, tokens); **suggestions** with keyboard navigation. |
| **Context panel** | Node editing (**name**, **team**); edge **type** editing; **node deletion**; **connections** view. |
| **Visual design** | Dark, high-contrast workspace; graph styling centralised for iteration. |

### Intentionally not done yet

- **Persistent database** (still in-memory).
- **Multi-user** / collaboration.
- **Notes and tags** in the UI.
- **Search** beyond the command bar.
- **AI** querying.

---

## 5. Core concepts

### Nodes

Represents **people** in the organisation.

**MVP scope:**

- Only **person** nodes.
- **Team** is **metadata**, not a separate entity.

**Fields:**

| Field | Description |
|--------|-------------|
| `id` | Stable identifier |
| `name` | Display name |
| `type` | Always `person` for created nodes |
| `team` | Optional string (e.g. “Payments”) |
| `notes` | Optional string (stored; **UI pending**) |

### Notes (critical concept)

Notes capture **unstructured knowledge** about a person:

- Skills and expertise  
- Working style  
- Relationships and context  
- Recent changes  

Notes are expected to become the **primary input** for future AI reasoning. They should be **fast to write**, **easy to scan**, and **continuously updated**.

### Edges

Represents **relationships** between people.

**Fields:**

| Field | Description |
|--------|-------------|
| `id` | Stable identifier |
| `from_id`, `to_id` | Endpoints |
| `type` | e.g. `works_with`, `reports_to`, `depends_on` |

Defaults to **`works_with`** if unspecified on create.

---

## 6. MVP scope (revised)

### Backend

- [x] Node CRUD  
- [x] Edge creation + type update  
- [x] Graph snapshot endpoint  
- [ ] **PostgreSQL** persistence (**next milestone**)

### Frontend

- [x] Graph visualisation and interaction  
- [x] Command-first creation flow  
- [x] Context panel for editing selection  
- [ ] **Notes** and **tags** in UI  

---

## 7. Future features

### Intelligence & discovery

Weave will support **lightweight reasoning** over the graph and notes.

**Examples:**

- “Who can help with payments?”  
- “Who is most connected to Alice?”  
- “Who might be a bottleneck?”  

**Approach:**

- Combine graph structure + notes + tags.  
- Provide **constrained, explainable** outputs.  
- Avoid generic chat interfaces.  

**AI** is an **augmentation** layer, not the primary interface.

### Product depth

- Notes + tags UI  
- Search and filtering  
- Export / import  
- Backups  

---

## 8. Privacy principles

- Data stored **locally** or under **user control**.  
- AI receives **minimal, explicit** context only.  
- **No** full-graph exposure by default.  
- Support for **local models** in future.  

---

## 9. Design principles

- **Speed** over completeness  
- **Graph-first** interaction  
- **Context matters** (notes + tags)  
- **Low friction** (keyboard-first)  
- **Progressive depth** (simple → rich)  

---

## 10. Technical stack

| Layer | Technology |
|--------|------------|
| **Backend** | Go (REST API) |
| **Frontend** | React (Vite), React Flow, Tailwind CSS, Radix-based primitives |
| **Database** | **Current:** in-memory · **Target:** PostgreSQL |
| **AI (future)** | OpenAI (initial); local models (future) |

---

## 11. Development phases

| Phase | Focus | Status |
|-------|--------|--------|
| 1 | Graph API + in-memory storage | **Done** |
| 2 | Frontend graph + command UX | **Done** |
| 3 | PostgreSQL persistence | **Next** |
| 4 | Notes, tags, search | Planned |
| 5 | AI reasoning | Planned |

---

## 12. Non-goals

- Not an **enterprise org-chart** product (at this stage).  
- Not a **multi-user SaaS** (for now).  
- Not a **generic AI chatbot** over user data.  

---

## Related documentation

| Doc | Purpose |
|-----|---------|
| [README.md](README.md) | Runbook, repo layout, API sketch |
| [docs/UI.md](docs/UI.md) | Frontend UI features and behaviour |
| [tasks.md](tasks.md) | Historical task list (may lag this PRD) |

# Weave — Product Requirements Document (PRD)

## 1. Overview

Weave is a **personal relationship intelligence** tool for tech leads. It separates two layers on purpose:

- **Graph** — **Structure and navigation**: who exists, how they connect, how you move the map to answer “who is tied to whom?”
- **Notes (and tags)** — **Meaning and memory**: the informal, personal knowledge that does not fit cleanly into boxes—expertise, history, risk, trust, context from real conversations.

You are not “drawing a chart for its own sake.” You are **maintaining a navigable model of people** and **a private intelligence layer** that compounds as you refine it over time.

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

Weave is designed to be used **continuously** alongside daily work. The loop is **capture → explore → contextualise → recall**—with **notes treated as living text** (short updates, rewrites, and additions over weeks and months), not one-off fields.

| Stage | What users do |
|--------|----------------|
| **Capture** | Add people, teams, and relationships via the **command bar**. Capture notes and tags in the **context panel** during or right after real interactions. |
| **Explore** | Move through the **graph**: selection, hover, focus, and focus mode to see structure at a glance. |
| **Contextualise** | Open a person’s **notes**, **tags**, and **connections**; refine what you know as the situation changes. |
| **Recall** | Answer fast: who can help? how are these people linked? what have I recorded about this person? |

This loop should take **seconds, not minutes**.

---

## 4. Current status (April 2026)

The product is a **single-user, command-first graph workspace** with a polished dark UI, interactive visualisation, and a **context panel** for working with selected items.

**UI behaviour (implemented interactions):** [docs/UI.md](docs/UI.md)

### Shipped (working end-to-end)

#### Backend (Go, REST, in-memory store)

| Area | Details |
|------|---------|
| **Nodes** | `GET` / `POST` / `PATCH` / `DELETE` `/nodes` — person nodes with `name`, `team`, `notes`, `tags` (notes/tags editable in the UI context panel). |
| **Edges** | `GET` / `POST` `/edges`, `PATCH` `/edges` — relationship links with **editable type**. |
| **Graph** | `GET` `/graph` — combined nodes and edges for the frontend. |

#### Frontend (React, Vite, React Flow, Tailwind)

| Area | Details |
|------|---------|
| **Interactive graph** | **Dagre** layout (top-to-bottom). **Person-style** nodes with **team colours**. **Selection**, **hover preview**, **focus dimming** (connected component). **Focus mode** (selected node + neighbours). **Subtle animated flow** on active edges. **Highlight** feedback after actions. |
| **Command bar** | **Primary interaction surface** (outside the context panel): **navigation** (type to match and focus people on the graph), **creation** (nodes and edges with forgiving syntax: `->`, `to`, tokens; suggestions and keyboard control). Same field is the natural home for **future** extensions (richer tag entry, notes capture, search)—without adding separate “modes” in the UI. |
| **Context panel** | Node editing (**name**, **team**, **notes**, **tags**); edge **type** editing; **node deletion**; **connections** view. |
| **Visual design** | Dark, high-contrast workspace; graph styling centralised for iteration. |

### Intentionally not done yet

- **Persistent database** (still in-memory).
- **Multi-user** / collaboration.
- Advanced tag UX (autocomplete/filtering) in the UI.
- **Search** beyond the command bar.
- **AI** querying.

---

## 5. Core concepts

### Command bar

The **command bar** is the main way to stay in flow: one input for **moving the graph** (who am I looking at?) and **changing the graph** (who exists, who links to whom). It is optimised for **keyboard use** and **immediate visual feedback** as you type. Deeper editing (notes, tags, long-form context) lives in the **context panel**; the bar remains the fast path for structure and navigation.

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
| `notes` | Optional string (editable in context panel) |
| `tags` | Optional string array (editable in context panel) |

### Notes (critical concept)

**Notes are a first-class product surface**, not an afterthought field. They are:

- **Unstructured** — free text, not a rigid schema.
- **Incremental** — added and edited in small passes as you learn more.
- **Personal** — your read on a person and the situation, not a corporate directory.

The **graph** tells you **structure** (who, how connected). **Notes** carry **meaning** (what you know, why it matters). Together they form the dataset for **future reasoning**: notes are expected to be the **primary narrative input** for AI-assisted answers; the graph supplies **grounded relationships** so responses stay tied to real people and links.

They should stay **fast to write**, **easy to scan**, and **worth revisiting** as facts change.

### Edges

Represents **relationships** between people.

**Fields:**

| Field | Description |
|--------|-------------|
| `id` | Stable identifier |
| `from_id`, `to_id` | Endpoints |
| `type` | e.g. `works_with`, `reports_to`, `depends_on` |

Defaults to **`works_with`** on **API** create if `type` is omitted. The **command bar** uses **`reports_to`** when the user omits a type (see [docs/UI.md](docs/UI.md)).

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
- [x] **Notes** and lightweight **tags** in UI  

---

## 7. Future features

### Intelligence & discovery

Weave will support **lightweight reasoning** over **notes + graph context** (and tags as signals)—not free-form chat over opaque blobs.

**Examples:**

- “Who can help with payments?”  
- “Who is most connected to Alice?”  
- “Who might be a bottleneck?”  

**Approach:**

- **Inputs:** graph structure (who links to whom) and **note/tag content** (what you have recorded).  
- **Outputs:** **Constrained and explainable**—answers should cite *which* people, *which* relationships, and *what* you wrote, where possible.  
- **Not** a **generic chatbot**; no open-ended “ask anything” as the default product shape.

**AI** is an **augmentation** layer over data you already own and understand, not a replacement for the graph or notes.

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

### Interaction philosophy

- **Keyboard-first** — the command bar and shortcuts stay central; mouse use is optional for core flows.  
- **No mode switching** — one workspace; depth appears in the panel and graph, not in separate “screens.”  
- **Immediate feedback** — the graph reacts as you type (e.g. focus and match), so the system feels responsive, not batchy.  
- **Progressive depth** — start with a name or a link; add notes and tags when you need meaning, not upfront.

### Product principles

- **Speed** over completeness  
- **Structure in the graph; meaning in the notes**  
- **Low friction** (capture in the moment)  
- **Honest scope** (personal tool, not enterprise org-chart theatre)  

---

## 10. Technical stack

| Layer | Technology |
|--------|-------------|
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
| 4 | Advanced tags, search | Planned |
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

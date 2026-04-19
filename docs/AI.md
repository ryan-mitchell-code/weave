# Weave — AI & Reasoning Design

Design and implementation plan for AI-assisted features. **Not** marketing copy—constraints and architecture only.

**Related docs:** [PRD.md](../PRD.md) (product goals, search §13) · [docs/UI.md](UI.md) (current UI) · [README.md](../README.md) (run and API layout)

---

## 1. Overview

In Weave, **AI means reasoning over the user’s own graph and notes**—not open-ended chat over arbitrary data.

- **Purpose:** Help interpret **relationships**, **notes**, and **tags** the user already captured.
- **Scope:** Works on **small, selected subsets** of the graph (never the full dataset in one call).
- **Outputs:** **Grounded** and **explainable**—tied to named people, edges, and note text.

AI is an **augmentation layer** on top of:

| Layer | Role |
|-------|------|
| **Graph** | Structure (who connects to whom) |
| **Notes / tags** | Context (what you know about people) |

The model does not replace the graph or the search API; it **adds synthesis and explanation** on retrieved, bounded context.

---

## 2. Core principles

Non-negotiable constraints for any shipped AI feature.

### Local-first

- All inference runs **on the user’s machine** (or same host as the API the user controls).
- **No** graph data, notes, or tags are sent to third-party inference APIs.
- **No** vendor receives user content for training or logging as part of Weave’s default path.

### Minimal context

- The model **never** receives the full graph.
- Typical input: **5–10 nodes** (sometimes fewer), each with a **fixed field budget** (see §4).

### Grounded outputs

- Answers must **cite the supplied context**: names, note snippets, relationship types or endpoints as given.
- **No** invented colleagues, teams, or facts not present in the context block.

### Deterministic fallback

- If the model is unavailable, times out, or returns unusable output, the product falls back to **existing behaviour**—e.g. **ranked search results** only, with no AI copy.

---

## 3. System architecture

End-to-end pipeline (conceptual):

```text
User query
  → backend search (existing /search and ranking)
  → top N nodes (small N)
  → context builder (structured text / JSON for the model)
  → local LLM (HTTP to local runtime)
  → structured response
  → UI
```

| Component | Responsibility |
|-----------|----------------|
| **Search** | Retrieve and rank **relevant nodes** (current scoring rules; see PRD §13.8). |
| **Context builder** | Select top **N**, strip fields, truncate notes, list **direct** connections by name. |
| **LLM** | Prioritise, summarise, or explain **using only** that context. |
| **UI** | Show lists, explanations, and errors; never imply certainty beyond the data. |

Search **retrieves**; AI **interprets** a bounded slice. Search remains authoritative for “what exists in the graph.”

---

## 4. Context building

What the model sees **per node** (typical shape):

- **name**
- **team** (if any)
- **notes** — truncated (e.g. **300–500 characters** per node; exact limit TBD in implementation)
- **tags**
- **Direct connections** — other person **names** only (and optionally relationship type label), not full subgraph dumps

**Global constraints:**

- **Max 5–10 nodes** per request (configurable constant).
- **No** raw export of the full store; **no** arbitrary graph traversal in v1 beyond direct neighbours of included nodes.

**Why:**

- **Performance** — smaller prompts, predictable latency.
- **Privacy** — minimal surface if the runtime is misconfigured.
- **Quality** — models behave better with focused, structured context than with huge dumps.

---

## 5. First feature: “Who can help with X?”

**Goal:** Answer questions like:

> *Who can help with payments?*

**Behaviour:**

1. Run **existing search** with the user’s query string (same retrieval semantics as today).
2. Take **top N** ranked nodes (N in the 5–10 range).
3. Pass built context to the **local LLM** with instructions to:
   - **Prioritise** who is most relevant (among **only** those nodes).
   - **Explain briefly** why (notes, tags, or relationships **from context only**).

**Expected output shape (v1):**

- **3–5 people** (subset of candidates if fewer exist).
- **One short paragraph per person**: relevance + pointer to **note or relationship** when applicable.
- If no good match: honest **“insufficient context”** using only supplied nodes—no fabrication.

---

## 6. Prompt design (initial)

Template only—exact wording will live in code and be versioned.

**System / instruction block:**

- You are assisting inside a **single-user** org graph tool.
- You receive **only** the structured context below. **Do not** invent people, teams, or facts.
- **Do not** use outside knowledge about the company or industry.
- Be **concise** (bullets or short sentences).
- If the context does not support an answer, say so explicitly.

**User message:**

- **Query:** `{user_query}`
- **Context:** `{structured_node_blocks}` (name, team, truncated notes, tags, connections per node)

**Structured context format (example):**

```text
--- Person: Alice Example
Team: Platform
Tags: payments, on-call
Notes (excerpt): ...
Connected to: Bob (works_with), Carol (reports_to)
---
```

---

## 7. Local model strategy

**Initial approach:**

- Run a **local** LLM via a **local HTTP server** (e.g. **Ollama**, or equivalent).
- Example model families: **Llama 3**, **Mistral**—exact model ID is an **ops choice**, not fixed here.

**Properties:**

- Inference runs **on the same machine** (or trusted host) as the user’s workflow.
- Weave’s backend calls **`http://127.0.0.1:<port>/...`** (or configured base URL)—**no** Weave → cloud inference path in the default design.
- **Failure modes:** service down, timeout, empty response → fallback to search-only (§2).

---

## 8. Backend integration

**New endpoint (planned):**

`POST /ai/query`

**Request body (minimal):**

```json
{
  "query": "string"
}
```

**Flow:**

1. Validate `query` (non-empty, length cap TBD).
2. Run **existing search** pipeline (reuse `/search` ranking or shared ranking function—**do not** fork match logic).
3. Take **top N** nodes.
4. **Build context** (§4).
5. **Call local LLM** with prompt (§6).
6. Return a **structured result** (JSON shape TBD: list of `{ person_id, summary, ... }`).

**Errors:** distinguish “search empty”, “LLM unavailable”, and “LLM returned invalid output”—UI shows search-only fallback where appropriate.

---

## 9. Safety and limitations

Current design **does not** include:

- **Long-term conversational memory** beyond what is already in **notes** and the graph.
- **Autonomous writes** to the graph or notes (AI suggests; user confirms—if ever added).
- **Background** or scheduled AI jobs.
- **External knowledge** (web, proprietary APIs) in the default path.

Users should treat AI output as **assistive text** grounded in the supplied context, not as authority.

---

## 10. Future extensions

Possible later work (all optional; local-first and minimal-context rules still apply unless explicitly revised):

- **Richer ranking inputs** for context selection: recency, graph distance, edge types (already partially present in search).
- **Structured JSON** output from the model (schema-validated) for safer UI binding.
- **Local embeddings** for retrieval—still **no** external vector DB by default.
- **Richer query classes**, e.g.:
  - *Who is connected to X and works on Y?*
  - *Who might be a bottleneck for Z?*  
  These imply **small, explicit subgraph extraction** + same context budget discipline.

---

## 11. Relationship to search

| Capability | Role |
|------------|------|
| **Search** | **Retrieval + ranking**—which nodes match and in what order (PRD §13, `/search`). |
| **AI** | **Explanation + synthesis** over a **small candidate set** returned by search. |

AI **must build on search** (or an equivalent internal ranker), **not** replace it. If search returns nothing, AI has **no** licence to invent candidates.

---

## Related documentation

| Doc | Use |
|-----|-----|
| [PRD.md](../PRD.md) | Product goals, search model, success criteria |
| [docs/UI.md](UI.md) | Current graph search and panels |
| [README.md](../README.md) | API overview, running the stack |

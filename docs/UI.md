# Weave — UI features

This document describes the **frontend user experience** as implemented today: layout, graph behaviour, command bar, **context panel**, and visual design. In product terms: the **graph** is **structure** (people and links); the **context panel** (especially **notes** and **tags**) is where **meaning** is captured and refined.

**Related docs:** [PRD.md](../PRD.md) (product goals, MVP, roadmap) · [README.md](../README.md) (run instructions, repo layout) · [docs/AI.md](AI.md) (planned: AI on top of search—not in the UI yet)

---

## 1. Application shell

| Area | Behaviour |
|------|------------|
| **Layout** | Full-height **Home** view: main graph column plus an optional **right-hand context panel** when a node or edge is selected. |
| **Header** | App title (**Weave**), **quick command** and **search** inputs (shared row), **Focus mode** toggle. |
| **Errors** | API/load/update failures surface as a **dismissible banner** at the top of the page (role=`alert`, `aria-live="assertive"`). |
| **Loading / empty state** | While the initial graph load is in flight, the canvas shows a **loading placeholder** (`role="status"`, `aria-busy`); once loaded with no nodes, it shows an **empty hint** in the same slot. |
| **Theme** | Dark, high-contrast workspace (Tailwind + small Radix-based controls). |

---

## 2. Graph canvas

Built with **React Flow**; positions come from **Dagre** (top-to-bottom layering). **Nodes are not draggable**; the graph is read as a structured layout.

### 2.0 Graph search (header field)

**Matching (graph highlight):** While the trimmed query is non-empty, nodes match if **any** of these fields contains the query as a **case-insensitive substring**: **name**, **team**, **tags** (any tag), **notes**.

- **Matching** nodes: full opacity + subtle blue **glow** (`drop-shadow` only — no scale, so layout positions stay fixed).
- **While typing:** **non-matching** nodes and edges that do **not** touch a matching node use the strict fade (global match highlight).
- **After choosing someone from the search list** (Enter / row click): the same **focus connected component** as a **direct node click** keeps normal focus opacity and **animated** edges for that subgraph, even when those nodes or internal edges do not match the query; the rest of the graph still uses the strict match fade.
- Search **layers on top** of the existing graph (layout and focus-mode rules are unchanged).

**Dropdown (top results):** Up to **8** rows. **Ranking** defaults to a simple client-side score (sum of category hits, each category at most once): name **+5**, team **+3**, any matching tag **+2**, notes **+1**; ties break alphabetically by name. When the API returns search results successfully, **row order** may follow server-side relevance (PRD §13.8) instead; **which nodes match** the query (for the graph and for which rows are shown) still follows the substring rules above, and row **presentation** (labels, emphasis) is unchanged. Rows are tuned for scanability: bold name, muted team, and a strongest-match reason when the top match is not name (**`Team: …`**, **`Tag: …`**, or a short **notes** excerpt ~40 chars with ellipsis). Matching substrings in the shown fields are emphasized with a subtle stronger text weight.

#### Matching vs ranking (important)

| Layer | Responsibility |
|------|----------------|
| **Frontend** | Which nodes **match** (case-insensitive substring on **name**, **team**, **tags**, **notes**) |
| **Backend** | **Ranks** candidates using weighted scoring (PRD §13.8) |

**Implication:** the graph can highlight **every** matching node (frontend), while the dropdown shows only the **top** ranked rows (backend).

#### Matching differences (intentional)

Frontend and backend **matching rules differ on purpose**:

- **Frontend:** a node matches if the **full query string** appears somewhere in those fields (broad, good for exploration).
- **Backend:** a node must match using **all query terms across the node** (stricter; see PRD §13.8 cross-field matching).

So some nodes may be **highlighted on the graph** but **not** appear in the top dropdown list. That is expected: the graph favours **discovery**; the ranked list favours **relevance**.

When the query is non-empty and ranking returns no rows, the dropdown shows **No matches found** and graph search overlay is not applied (graph returns to normal styling).

**Keyboard and preview:** **ArrowDown** / **ArrowUp** move the active row (minimum index **0** while results exist). **Enter** selects the active row (opens the node context panel); the query **stays** in the field. **Escape** clears the active row index and closes the list. Mouse **hover** on a row updates the active row. While the **results dropdown is open**, the graph **preview** uses the same focus-dimming rules as node hover: the **preview anchor** is the **active list row** if any, otherwise the **first** ranked result, then graph **hover**, then **selection** (`searchPreviewNodeId` → `hoveredNodeId` → `selectedNodeId` in `GraphView`). After the list **closes** (pick, Escape, or blur), `searchPreviewNodeId` is not applied, so dimming matches a **direct node click** (**hover**, then **selection**).

### 2.1 Person nodes

- **Card layout:** Circular **avatar** (initials from name), **bold name**, **team** line (or **Unassigned** when empty).
- **Team colour:** Stable **palette per team** (hash of team label): avatar fill, left **accent bar**, optional subtle **card background** variation (`slate-800` vs `slate-800/80`).
- **Unassigned:** Neutral **slate** avatar; team label **italic** and muted.
- **Display normalisation:** Names and teams are shown in **title case** (words capitalised); matching in the command bar is **case-insensitive**.

### 2.2 Selection and focus

| Interaction | Effect |
|-------------|--------|
| **Click node** | Sets **persistent selection**; opens the **node** context panel; **recenters** the viewport on that node (animated). Clears transient **hover preview**. |
| **Click edge** | Selects edge; opens the **edge** context panel; clears node selection and hover preview. |
| **Click pane** | Clears node and edge selection and hover preview. |
| **Hover node** | **Preview focus:** the **connected component** around the hovered node stays full **opacity**; other nodes **fade**. **Edges** in that component stay strong; others **dim**. Does not change click selection. |
| **Hover leave** | Preview clears after a short delay (~75ms) to reduce flicker when moving between nodes. |

When the **search results list is open** and a preview node is passed to the graph, **search preview** wins for dimming; otherwise **hover** takes precedence over **selection** until the pointer leaves or you click (hover is cleared on node click).

### 2.3 Focus mode (toggle)

- **On:** Graph shows only the **selected node**, its **incident edges**, and **endpoints** of those edges.
- **Off:** Full graph (still subject to focus dimming when a node is hovered or selected as above).
- Requires a **selected node** to restrict the view; otherwise behaves like full graph.

### 2.4 Edges

- **Curved paths** (custom edge) with **parallel edge offset** when multiple links share the same pair of people.
- **Colour by relationship type** (e.g. reports_to, depends_on, works_with).
- **Arrow** markers indicate **direction** (source → target).
- **Labels** on edges show the relationship type (human-readable).
- **Selected edge** is drawn **thicker** and brought forward.
- **Flash highlight** after quick-create or similar actions: edge **pulses** with stronger stroke (and participates in **dash flow** when active — see below).

### 2.5 Active edge animation

When an edge is **in the focused subgraph** (hover or selection) or is the **highlighted** edge:

- **Animated dash** (`stroke-dasharray` + CSS `@keyframes flow`) for a subtle **directional flow**.
- Slight **drop-shadow** tinted to the edge stroke.
- **Inactive** edges under focus: **low opacity**, **no** animation, **no** glow.

With **no** focus anchor, edges use the default calm styling (no global marching ants).

### 2.6 Keyboard

- **Delete:** Deletes the **current selection** when focus is not inside a text field (input/textarea/select) or contenteditable region. If a **node** is selected it is removed along with any incident edges; otherwise the **selected edge** is removed. Graph and API update accordingly; selection clears after a successful delete.

---

## 3. Command bar (quick input)

Single field for fast graph edits without opening the context panel for every change.

| Capability | Details |
|------------|---------|
| **Add person** | `Name` or `Name TeamName` (team as remaining words). |
| **Add edge** | `a -> b`, `a to b`, or two **known** names as tokens; optional **edge type** (e.g. suffix or `right -> type`). Omitted type defaults to **`reports_to`**. |
| **Suggestions** | Filtered list of people while typing; **keyboard**: ArrowUp/Down, Enter to pick a suggestion. |
| **Search vs create** | **Case-insensitive** full-name match: shows **Viewing {name}** (no create row); changing the typed value to a **non-matching** string shows **Create "{input}"** — **primary** when there are no other matches, **secondary** (below suggestions) when partial matches exist. Edge syntax (`->` / `to`) unchanged. |
| **Tab** | With suggestions or the **Add relationship (`->`)** helper open: **first Tab** can **complete** the highlighted person name; when that helper is shown, a **second Tab** inserts ` -> ` so you can type the other person without leaving the field. |
| **Enter** | With a **listed suggestion** focused: applies it. With an **exact existing name** in the field (node mode): **no-op** (no duplicate create). Otherwise: **create** or **edge** per the typed command; **focus stays** in the field after a successful action. |
| **Loading** | Input disabled while graph is loading or a quick action is in flight. |

When the trimmed input **exactly matches** a person’s name, the graph **selection** updates to that person as you **type** (so the view can center on them). Clicking another node or the pane is not overwritten until you **change** the command text.

Successful creates **flash** the new node or edge on the graph and may **update selection** for visibility.

---

## 4. Context panel

The **context panel** (implementation: `components/home/details`) appears when a **node** or **edge** is selected. It is the primary place to **edit** selection details beyond the command bar.

### Node

- Edit **name** and **team** (pill-style inputs); **save on blur** or **Enter**; focus **stays** in the field (no jump to another control).
- Edit **notes** as a lightweight **line-based scratchpad**: one idea per line, click a line to edit, `+ Add note` for quick append, Enter/blur to save, and clear a line to delete it.
- Edit **tags** inline (pill list, `+ Add tag`, Enter create, Backspace remove-last, `×` remove).
- **Delete node** — two-step confirm button (first click arms the action and recolours to destructive; a second click within ~3s deletes).
- **Connections** list with formatted labels and edge types.

`id` and `type` remain on the API model but are **omitted from the panel** to reduce noise.

### Edge

- Change **relationship type** (dropdown / select aligned with API types).
- Context for **source** and **target** nodes where applicable.
- **Delete edge** — same two-step confirm button as the node panel (first click arms, second click within ~3s deletes). Only the edge is removed; both endpoint nodes remain.

**Note:** Current tags are intentionally lightweight (no autocomplete/dropdowns yet); richer tag workflows remain future work.

---

## 5. File map (frontend)

| Path | Role |
|------|------|
| `frontend/src/pages/Home.tsx` | Shell, selection state, focus mode, hover preview; composes graph search hook + input. |
| `frontend/src/pages/home/useNodeDraft.ts` | Drafts + persist for the selected node (name/team/notes/tags) with dirty-check and error surfacing. |
| `frontend/src/pages/home/useDeleteSelectionShortcut.ts` | Binds the Delete key to the current selection (node or edge) when focus is outside text fields. |
| `frontend/src/components/common/ErrorBanner.tsx` | Dismissible top-of-page error banner. |
| `frontend/src/components/common/ConfirmDeleteButton.tsx` | Two-step confirm delete button primitive reused by node and edge details. |
| `frontend/src/components/home/GraphCanvasPlaceholder.tsx` | Loading / empty state placeholder for the graph canvas. |
| `frontend/src/components/home/graphSearch/*` | `useGraphSearch` (query, matching IDs, preview id, ranked results) and `GraphSearchInput` (combobox UI; owns its own dropdown-open + blur debounce). |
| `frontend/src/lib/graphSearchMatch.ts` | Pure search: field matching, scoring, ranking, match hints for the dropdown. |
| `frontend/src/graph/GraphView.tsx` | React Flow shell, visible graph, hover debounce, viewport center, search visual overlay. |
| `frontend/src/graph/dagreLayout.ts` | Dagre node positions. |
| `frontend/src/graph/focusSets.ts` | Connected-component focus for dimming. |
| `frontend/src/graph/buildFlowEdges.ts` | React Flow edge payloads (stroke, labels, animation). |
| `frontend/src/graph/viewConstants.ts` | Shared focus/hover timing and search-overlay opacity/glow constants. |
| `frontend/src/graph/PersonNode.tsx` | Person card rendering and selection ring. |
| `frontend/src/graph/CustomEdge.tsx` | Edge geometry. |
| `frontend/src/graph/graphTheme.ts` | Layout spacing and shared edge/node tokens. |
| `frontend/src/graph/team.ts` | Team display labels (`Unassigned`, formatting). |
| `frontend/src/graph/teamColors.ts` | Per-team colours for nodes. |
| `frontend/src/components/home/QuickInputBar.tsx` | Command field and suggestion dropdown. |
| `frontend/src/components/home/quickInputDerived.ts` | Pure derived UI flags (viewing / create / panel visibility). |
| `frontend/src/components/home/quickInputBarKeyboard.ts` | Key handling for the command field. |
| `frontend/src/components/home/details/*` | Context panel sections. |
| `frontend/src/components/home/details/NotesInlineEditor.tsx` | Notes scratchpad UI (line list add/edit/delete) persisted as newline-delimited `notes` text. |
| `frontend/src/pages/home/*` | Quick command hook, `quickInputLogic`, `quickCommandExecute`, labels, shortcuts, shared constants. |
| `frontend/src/api/client.ts` | REST helpers; **`fetchGraph`** normalizes **`nodes`/`edges`** to arrays (Go may JSON-encode empty slices as **`null`**). |
| `frontend/src/lib/normalizeTags.ts` | Tag list trim/dedup before persist (matches API normalization). |
| `frontend/src/index.css` | Global base styles; **flow** keyframes for edges. |

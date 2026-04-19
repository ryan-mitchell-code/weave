package handlers

import (
	"log"
	"net/http"
	"sort"
	"strings"

	"org-graph/internal/models"
	"org-graph/internal/store"
)

// PRD §13.8 MVP weights — keep in sync with product docs.
const (
	scoreNameExact   = 100
	scoreNamePrefix  = 70
	scoreNamePartial = 50
	scoreTagOrTeam   = 40
	scoreNotes       = 20
	scoreProximity   = 15
	// scoreRecency = 10 — not implemented (recently viewed/edited with decay).
)

// SearchResult is one ranked node from GET /search.
type SearchResult struct {
	Node  models.Node `json:"node"`
	Score int         `json:"score"`
}

// Search handles GET /search?q=...&selected_node_id=...
// Ranking follows PRD §13.8 (MVP): name, team, tags, notes, graph proximity; recency not implemented yet.
func Search(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	q := strings.TrimSpace(r.URL.Query().Get("q"))
	qLower := strings.ToLower(q)
	selectedNodeID := strings.TrimSpace(r.URL.Query().Get("selected_node_id"))
	log.Printf("search q=%q selected_node_id=%q", q, selectedNodeID)

	if qLower == "" {
		writeJSON(w, http.StatusOK, []SearchResult{})
		return
	}

	nodes := store.SnapshotNodes()
	edges := store.SnapshotEdges()
	neighbors := neighborIDs(edges, selectedNodeID)

	out := make([]SearchResult, 0, len(nodes))
	for _, n := range nodes {
		s := scoreNode(n, qLower, neighbors)
		if s > 0 {
			out = append(out, SearchResult{Node: n, Score: s})
		}
	}

	sort.Slice(out, func(i, j int) bool {
		if out[i].Score != out[j].Score {
			return out[i].Score > out[j].Score
		}
		ni := strings.ToLower(out[i].Node.Name)
		nj := strings.ToLower(out[j].Node.Name)
		return ni < nj
	})

	writeJSON(w, http.StatusOK, out)
}

// neighborIDs returns IDs directly connected to selectedID (undirected). Nil if selectedID is empty.
func neighborIDs(edges []models.Edge, selectedID string) map[string]struct{} {
	if selectedID == "" {
		return nil
	}
	m := make(map[string]struct{})
	for _, e := range edges {
		if e.FromID == selectedID {
			m[e.ToID] = struct{}{}
		}
		if e.ToID == selectedID {
			m[e.FromID] = struct{}{}
		}
	}
	return m
}

// matchesAllTerms reports whether text contains every whitespace-separated term in query (AND).
// Both arguments must be lowercased; query is typically the handler’s trimmed qLower.
// Empty or whitespace-only query yields no terms and returns false.
func matchesAllTerms(text, query string) bool {
	terms := strings.Fields(query)
	if len(terms) == 0 {
		return false
	}
	for _, t := range terms {
		if !strings.Contains(text, t) {
			return false
		}
	}
	return true
}

func scoreNode(n models.Node, qLower string, neighbors map[string]struct{}) int {
	score := scoreFromName(n, qLower)
	score += scoreFromTeam(n.Team, qLower)
	score += scoreFromTags(n.Tags, qLower)
	score += scoreFromNotes(n.Notes, qLower)

	if neighbors != nil {
		if _, ok := neighbors[n.ID]; ok {
			score += scoreProximity
		}
	}

	return score
}

func scoreFromName(n models.Node, qLower string) int {
	nameLower := strings.ToLower(strings.TrimSpace(n.Name))
	switch {
	case nameLower == qLower:
		return scoreNameExact
	case strings.HasPrefix(nameLower, qLower):
		return scoreNamePrefix
	case matchesAllTerms(nameLower, qLower):
		return scoreNamePartial
	default:
		return 0
	}
}

func scoreFromTeam(team, qLower string) int {
	teamLower := strings.ToLower(strings.TrimSpace(team))
	if teamLower == "" {
		return 0
	}
	if teamLower == qLower {
		return scoreTagOrTeam
	}
	if matchesAllTerms(teamLower, qLower) {
		return scoreTagOrTeam
	}
	return 0
}

func scoreFromTags(tags []string, qLower string) int {
	for _, t := range tags {
		tl := strings.ToLower(strings.TrimSpace(t))
		if tl == "" {
			continue
		}
		if tl == qLower {
			return scoreTagOrTeam
		}
		if matchesAllTerms(tl, qLower) {
			return scoreTagOrTeam
		}
	}
	return 0
}

func scoreFromNotes(notes, qLower string) int {
	if matchesAllTerms(strings.ToLower(notes), qLower) {
		return scoreNotes
	}
	return 0
}

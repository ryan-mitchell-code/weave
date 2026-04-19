package handlers

import (
	"encoding/json"
	"io"
	"log"
	"net/http"
	"sort"
	"strings"
	"time"

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
)

// Recency decay tiers (PRD §13.8 +10 with decay). Applied only when POST body includes timestamps.
const (
	scoreRecency5m  = 10
	scoreRecency1h  = 8
	scoreRecency6h  = 5
	scoreRecency24h = 2
)

// maxSearchBodyBytes caps POST /search JSON to avoid unbounded memory on malicious clients.
const maxSearchBodyBytes = 256 << 10

// SearchResult is one ranked node from GET or POST /search.
type SearchResult struct {
	Node  models.Node `json:"node"`
	Score int         `json:"score"`
}

type searchRequestBody struct {
	Recency map[string]int64 `json:"recency"`
}

// Search handles GET /search?q=...&selected_node_id=... (no recency) and
// POST with the same query string plus JSON body `{ "recency": { "nodeId": <epoch_ms> } }`.
// Ranking follows PRD §13.8: name, team, tags, notes, graph proximity, recency (decayed).
func Search(w http.ResponseWriter, r *http.Request) {
	var recency map[string]int64
	switch r.Method {
	case http.MethodGet:
		recency = nil
	case http.MethodPost:
		recency = parseSearchRecencyBody(r)
	default:
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
		s := scoreNode(n, qLower, neighbors, recency)
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

func parseSearchRecencyBody(r *http.Request) map[string]int64 {
	if r.Body == nil {
		return nil
	}
	defer r.Body.Close()
	data, err := io.ReadAll(io.LimitReader(r.Body, maxSearchBodyBytes+1))
	if err != nil || len(data) == 0 {
		return nil
	}
	if len(data) > maxSearchBodyBytes {
		log.Printf("search: recency body exceeds %d bytes, ignoring", maxSearchBodyBytes)
		return nil
	}
	var body searchRequestBody
	if err := json.Unmarshal(data, &body); err != nil {
		log.Printf("search: ignoring recency body: %v", err)
		return nil
	}
	if len(body.Recency) == 0 {
		return nil
	}
	return body.Recency
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

// matchesAllTerms reports whether text contains every whitespace-separated term in query (AND)
// within that single string. Used by tests; scoring uses matchesAllTermsAcrossNode + per-field contains.
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

func buildSearchCorpus(n models.Node) string {
	var parts []string

	if n.Name != "" {
		parts = append(parts, strings.ToLower(strings.TrimSpace(n.Name)))
	}
	if n.Team != "" {
		parts = append(parts, strings.ToLower(strings.TrimSpace(n.Team)))
	}
	for _, t := range n.Tags {
		if strings.TrimSpace(t) != "" {
			parts = append(parts, strings.ToLower(strings.TrimSpace(t)))
		}
	}
	if n.Notes != "" {
		parts = append(parts, strings.ToLower(n.Notes))
	}

	return strings.Join(parts, " ")
}

// matchesAllTermsAcrossNode is true when every whitespace-separated query term appears as a
// substring somewhere across name, team, tags, and notes (case-insensitive).
func matchesAllTermsAcrossNode(n models.Node, qLower string) bool {
	terms := strings.Fields(qLower)
	if len(terms) == 0 {
		return false
	}

	corpus := buildSearchCorpus(n)

	for _, t := range terms {
		if !strings.Contains(corpus, t) {
			return false
		}
	}
	return true
}

// fieldContainsAnyQueryTerm is true if field (already lowercased) contains at least one query term.
// Per-field scoring: global AND is enforced by matchesAllTermsAcrossNode.
func fieldContainsAnyQueryTerm(fieldLower, qLower string) bool {
	for _, term := range strings.Fields(qLower) {
		if term != "" && strings.Contains(fieldLower, term) {
			return true
		}
	}
	return false
}

// hasPrefixOnFirstTerm is true when the name starts with the first whitespace-separated
// query term (multi-term queries still get prefix credit when the leading token matches).
func hasPrefixOnFirstTerm(nameLower, qLower string) bool {
	terms := strings.Fields(qLower)
	if len(terms) == 0 {
		return false
	}
	return strings.HasPrefix(nameLower, terms[0])
}

func recencyBoost(id string, recency map[string]int64) int {
	if recency == nil {
		return 0
	}
	ts, ok := recency[id]
	if !ok {
		return 0
	}
	age := time.Since(time.UnixMilli(ts))

	switch {
	case age < 5*time.Minute:
		return scoreRecency5m
	case age < 1*time.Hour:
		return scoreRecency1h
	case age < 6*time.Hour:
		return scoreRecency6h
	case age < 24*time.Hour:
		return scoreRecency24h
	default:
		return 0
	}
}

func scoreNode(n models.Node, qLower string, neighbors map[string]struct{}, recency map[string]int64) int {
	if !matchesAllTermsAcrossNode(n, qLower) {
		return 0
	}

	score := scoreFromName(n, qLower)
	score += scoreFromTeam(n.Team, qLower)
	score += scoreFromTags(n.Tags, qLower)
	score += scoreFromNotes(n.Notes, qLower)

	if neighbors != nil {
		if _, ok := neighbors[n.ID]; ok {
			score += scoreProximity
		}
	}

	score += recencyBoost(n.ID, recency)

	return score
}

func scoreFromName(n models.Node, qLower string) int {
	nameLower := strings.ToLower(strings.TrimSpace(n.Name))
	switch {
	case nameLower == qLower:
		return scoreNameExact
	case hasPrefixOnFirstTerm(nameLower, qLower):
		return scoreNamePrefix
	case fieldContainsAnyQueryTerm(nameLower, qLower):
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
	if fieldContainsAnyQueryTerm(teamLower, qLower) {
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
		if fieldContainsAnyQueryTerm(tl, qLower) {
			return scoreTagOrTeam
		}
	}
	return 0
}

func scoreFromNotes(notes, qLower string) int {
	notesLower := strings.ToLower(notes)
	if fieldContainsAnyQueryTerm(notesLower, qLower) {
		return scoreNotes
	}
	return 0
}

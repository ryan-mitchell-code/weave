package handlers

import (
	"strings"
	"testing"
	"time"

	"org-graph/internal/models"
)

func TestMatchesAllTerms(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name  string
		text  string
		query string
		want  bool
	}{
		{"empty query no terms", "hello world", "", false},
		{"whitespace query", "hello world", "   ", false},
		{"single term match", "hello world", "hello", true},
		{"single term no match", "hello world", "goodbye", false},
		{"all terms present", "acme platform team", "acme team", true},
		{"missing one term", "acme platform", "acme team", false},
		{"order independent", "foo bar baz", "baz foo", true},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			if got := matchesAllTerms(tt.text, tt.query); got != tt.want {
				t.Fatalf("matchesAllTerms(%q, %q) = %v, want %v", tt.text, tt.query, got, tt.want)
			}
		})
	}
}

func TestScoreNode(t *testing.T) {
	t.Parallel()

	neighbors := map[string]struct{}{"n2": {}}

	tests := []struct {
		name      string
		node      models.Node
		q         string
		neighbors map[string]struct{}
		want      int
	}{
		{
			name: "name exact",
			node: models.Node{ID: "a", Name: "Alice"},
			q:    "alice",
			want: scoreNameExact,
		},
		{
			name: "name prefix",
			node: models.Node{ID: "a", Name: "Alice Smith"},
			q:    "alice",
			want: scoreNamePrefix,
		},
		{
			name: "name prefix on first term for multi-word query",
			node: models.Node{ID: "a", Name: "Bob The Builder"},
			q:    "bob builder",
			want: scoreNamePrefix,
		},
		{
			name: "team match",
			node: models.Node{ID: "a", Name: "X", Team: "Platform"},
			q:    "platform",
			want: scoreTagOrTeam,
		},
		{
			name: "tag match",
			node: models.Node{ID: "a", Name: "X", Tags: []string{"golang"}},
			q:    "golang",
			want: scoreTagOrTeam,
		},
		{
			name: "notes match",
			node: models.Node{ID: "a", Name: "X", Notes: "owns the billing service"},
			q:    "billing service",
			want: scoreNotes,
		},
		{
			name:      "proximity boost",
			node:      models.Node{ID: "n2", Name: "Neighbor"},
			q:         "neighbor",
			neighbors: neighbors,
			want:      scoreNameExact + scoreProximity,
		},
		{
			name:      "no proximity when not neighbor",
			node:      models.Node{ID: "n9", Name: "Far"},
			q:         "far",
			neighbors: neighbors,
			want:      scoreNameExact,
		},
		{
			name: "no match",
			node: models.Node{ID: "a", Name: "Zed"},
			q:    "nomatch",
			want: 0,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			qLower := tt.q
			got := scoreNode(tt.node, qLower, tt.neighbors, nil)
			if got != tt.want {
				t.Fatalf("scoreNode(...) = %d, want %d", got, tt.want)
			}
		})
	}
}

func TestHasPrefixOnFirstTerm(t *testing.T) {
	t.Parallel()
	if !hasPrefixOnFirstTerm("alice smith", "alice") {
		t.Fatal("single-term query: expected prefix")
	}
	if !hasPrefixOnFirstTerm("alice smith", "ali sm") {
		t.Fatal("multi-term query: first token ali should prefix-match alice")
	}
	if hasPrefixOnFirstTerm("bob jones", "ali") {
		t.Fatal("should not prefix when first token differs")
	}
	if hasPrefixOnFirstTerm("x", "") {
		t.Fatal("empty query should be false")
	}
}

func TestMatchesAllTermsAcrossNode(t *testing.T) {
	t.Parallel()

	team := "Payments"
	notes := "Works on infrastructure"
	n := models.Node{ID: "1", Name: "X", Team: team, Notes: notes}

	if !matchesAllTermsAcrossNode(n, "payments infra") {
		t.Fatal("expected cross-field match for payments + infra")
	}
	if matchesAllTermsAcrossNode(n, "payments infra nomatch") {
		t.Fatal("should not match when a term is missing everywhere")
	}

	tagsSplit := models.Node{ID: "2", Name: "N", Tags: []string{"alpha", "beta"}}
	if !matchesAllTermsAcrossNode(tagsSplit, "alpha beta") {
		t.Fatal("terms split across two tags should match")
	}
}

func TestScoreNodeZeroWhenCrossFieldUnsatisfied(t *testing.T) {
	t.Parallel()
	n := models.Node{ID: "a", Name: "Only", Team: "Payments"}
	got := scoreNode(n, "payments infra", nil, nil)
	if got != 0 {
		t.Fatalf("scoreNode(...) = %d, want 0 when infra appears nowhere", got)
	}
}

func TestScoreNodeMultipleTagsStillOneTagScore(t *testing.T) {
	t.Parallel()
	n := models.Node{
		ID:   "a",
		Name: "X",
		Tags: []string{"payments", "infra"},
	}
	got := scoreNode(n, "pay infra", nil, nil)
	if got != scoreTagOrTeam {
		t.Fatalf("scoreNode(...) = %d, want single tag weight %d when multiple tags match", got, scoreTagOrTeam)
	}
}

func TestBuildSearchCorpus(t *testing.T) {
	t.Parallel()
	n := models.Node{
		ID:    "1",
		Name:  "N",
		Team:  "T",
		Tags:  []string{"g1", "g2"},
		Notes: "notes",
	}
	c := buildSearchCorpus(n)
	for _, sub := range []string{"n", "t", "g1", "g2", "notes"} {
		if !strings.Contains(c, sub) {
			t.Fatalf("corpus %q missing substring %q", c, sub)
		}
	}
}

func TestScoreNodeCrossFieldMultiTerm(t *testing.T) {
	t.Parallel()
	n := models.Node{
		ID:    "1",
		Name:  "Someone",
		Team:  "Payments",
		Notes: "Works on infrastructure",
	}
	got := scoreNode(n, "payments infra", nil, nil)
	want := scoreTagOrTeam + scoreNotes
	if got != want {
		t.Fatalf("scoreNode(...) = %d, want %d (team + notes)", got, want)
	}
}

func TestRecencyBoost(t *testing.T) {
	t.Parallel()
	now := time.Now()
	tests := []struct {
		name string
		age  time.Duration
		want int
	}{
		{"under 5 min", -2 * time.Minute, 10},
		{"under 1 hour", -30 * time.Minute, 8},
		{"under 6 hours", -3 * time.Hour, 5},
		{"under 24 hours", -12 * time.Hour, 2},
		{"older than 24 hours", -48 * time.Hour, 0},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			const id = "person1"
			m := map[string]int64{id: now.Add(tt.age).UnixMilli()}
			if got := recencyBoost(id, m); got != tt.want {
				t.Fatalf("recencyBoost(...) = %d, want %d", got, tt.want)
			}
		})
	}
}

func TestRecencyBoostMissing(t *testing.T) {
	t.Parallel()
	if recencyBoost("x", nil) != 0 {
		t.Fatal("nil map should yield 0")
	}
	if recencyBoost("x", map[string]int64{}) != 0 {
		t.Fatal("empty map should yield 0")
	}
}

func TestRecencyBoostFutureTimestamp(t *testing.T) {
	t.Parallel()
	now := time.Now()
	m := map[string]int64{"x": now.Add(1 * time.Hour).UnixMilli()}
	if got := recencyBoost("x", m); got != scoreRecency5m {
		t.Fatalf("future wall time should use freshest tier, got %d want %d", got, scoreRecency5m)
	}
}

func TestScoreNodeWithRecency(t *testing.T) {
	t.Parallel()
	ts := time.Now().UnixMilli()
	rec := map[string]int64{"a": ts}
	n := models.Node{ID: "a", Name: "Alice"}
	got := scoreNode(n, "alice", nil, rec)
	want := scoreNameExact + scoreRecency5m
	if got != want {
		t.Fatalf("scoreNode with recency = %d, want %d", got, want)
	}
}

func TestNeighborIDs(t *testing.T) {
	t.Parallel()

	edges := []models.Edge{
		{FromID: "a", ToID: "b"},
		{FromID: "b", ToID: "c"},
	}
	m := neighborIDs(edges, "b")
	if len(m) != 2 {
		t.Fatalf("len = %d, want 2", len(m))
	}
	if _, ok := m["a"]; !ok {
		t.Fatal("missing a")
	}
	if _, ok := m["c"]; !ok {
		t.Fatal("missing c")
	}
	if neighborIDs(edges, "") != nil {
		t.Fatal("empty selectedID should return nil map")
	}
}

package handlers

import (
	"testing"

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
			name: "name partial multi-term",
			node: models.Node{ID: "a", Name: "Bob The Builder"},
			q:    "bob builder",
			want: scoreNamePartial,
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
			got := scoreNode(tt.node, qLower, tt.neighbors)
			if got != tt.want {
				t.Fatalf("scoreNode(...) = %d, want %d", got, tt.want)
			}
		})
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

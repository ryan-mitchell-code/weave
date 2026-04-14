// Package store holds in-memory nodes and edges (Nodes, Edges).
// Mutate only through AddNode and AddEdge so locking stays consistent.
package store

import (
	"errors"
	"sync"

	"org-graph/internal/models"
)

var ErrDuplicateEdge = errors.New("duplicate edge")

var (
	mu sync.RWMutex

	// Nodes is the in-memory node list.
	Nodes []models.Node
	// Edges is the in-memory edge list.
	Edges []models.Edge
)

func AddNode(n models.Node) {
	mu.Lock()
	defer mu.Unlock()
	Nodes = append(Nodes, n)
}

func AddEdge(e models.Edge) error {
	mu.Lock()
	defer mu.Unlock()
	for _, x := range Edges {
		if x.FromID == e.FromID && x.ToID == e.ToID {
			return ErrDuplicateEdge
		}
	}
	Edges = append(Edges, e)
	return nil
}

func NodeExists(id string) bool {
	mu.RLock()
	defer mu.RUnlock()
	for _, n := range Nodes {
		if n.ID == id {
			return true
		}
	}
	return false
}

// SnapshotNodes returns a copy of Nodes safe to JSON-encode without holding the lock.
func SnapshotNodes() []models.Node {
	mu.RLock()
	defer mu.RUnlock()
	out := make([]models.Node, len(Nodes))
	copy(out, Nodes)
	return out
}

// SnapshotEdges returns a copy of Edges safe to JSON-encode without holding the lock.
func SnapshotEdges() []models.Edge {
	mu.RLock()
	defer mu.RUnlock()
	out := make([]models.Edge, len(Edges))
	copy(out, Edges)
	return out
}

// Graph returns a consistent snapshot for JSON responses.
func Graph() models.Graph {
	mu.RLock()
	defer mu.RUnlock()
	gn := make([]models.Node, len(Nodes))
	copy(gn, Nodes)
	ge := make([]models.Edge, len(Edges))
	copy(ge, Edges)
	return models.Graph{Nodes: gn, Edges: ge}
}

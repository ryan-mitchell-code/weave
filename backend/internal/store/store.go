// Package store holds in-memory nodes and edges (Nodes, Edges).
// Mutate only through AddNode and AddEdge so locking stays consistent.
package store

import (
	"errors"
	"sync"

	"org-graph/internal/models"
)

var ErrDuplicateEdge = errors.New("duplicate edge")
var ErrEdgeNotFound = errors.New("edge not found")
var ErrNodeNotFound = errors.New("node not found")

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

func UpdateNode(id, name, team, notes string, tags []string) (models.Node, error) {
	mu.Lock()
	defer mu.Unlock()

	for i := range Nodes {
		if Nodes[i].ID != id {
			continue
		}
		updated := Nodes[i]
		updated.Name = name
		updated.Team = team
		updated.Notes = notes
		updated.Tags = tags
		Nodes[i] = updated
		return updated, nil
	}

	return models.Node{}, ErrNodeNotFound
}

func DeleteNode(id string) (models.Node, error) {
	mu.Lock()
	defer mu.Unlock()

	nodeIdx := -1
	var deleted models.Node
	for i := range Nodes {
		if Nodes[i].ID == id {
			nodeIdx = i
			deleted = Nodes[i]
			break
		}
	}
	if nodeIdx == -1 {
		return models.Node{}, ErrNodeNotFound
	}

	Nodes = append(Nodes[:nodeIdx], Nodes[nodeIdx+1:]...)

	filtered := Edges[:0]
	for _, e := range Edges {
		if e.FromID == id || e.ToID == id {
			continue
		}
		filtered = append(filtered, e)
	}
	Edges = filtered

	return deleted, nil
}

func AddEdge(e models.Edge) error {
	mu.Lock()
	defer mu.Unlock()
	for _, x := range Edges {
		if x.FromID == e.FromID && x.ToID == e.ToID && x.Type == e.Type {
			return ErrDuplicateEdge
		}
	}
	Edges = append(Edges, e)
	return nil
}

func DeleteEdge(id string) (models.Edge, error) {
	mu.Lock()
	defer mu.Unlock()

	for i := range Edges {
		if Edges[i].ID != id {
			continue
		}
		deleted := Edges[i]
		Edges = append(Edges[:i], Edges[i+1:]...)
		return deleted, nil
	}

	return models.Edge{}, ErrEdgeNotFound
}

func UpdateEdgeType(id, edgeType string) (models.Edge, error) {
	mu.Lock()
	defer mu.Unlock()

	for i := range Edges {
		if Edges[i].ID != id {
			continue
		}

		updated := Edges[i]
		updated.Type = edgeType
		for j := range Edges {
			if i == j {
				continue
			}
			x := Edges[j]
			if x.FromID == updated.FromID && x.ToID == updated.ToID && x.Type == updated.Type {
				return models.Edge{}, ErrDuplicateEdge
			}
		}

		Edges[i] = updated
		return updated, nil
	}

	return models.Edge{}, ErrEdgeNotFound
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

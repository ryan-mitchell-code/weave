package store

import (
	"sync"

	"org-graph/internal/models"
)

// MemoryStore is the default in-process store (no database).
type MemoryStore struct {
	mu    sync.RWMutex
	nodes []models.Node
	edges []models.Edge
}

// NewMemoryStore returns an empty in-memory store.
func NewMemoryStore() *MemoryStore {
	return &MemoryStore{}
}

func (m *MemoryStore) AddNode(n models.Node) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.nodes = append(m.nodes, n)
}

func (m *MemoryStore) UpdateNode(id, name, team, notes string, tags []string) (models.Node, error) {
	m.mu.Lock()
	defer m.mu.Unlock()

	for i := range m.nodes {
		if m.nodes[i].ID != id {
			continue
		}
		updated := m.nodes[i]
		updated.Name = name
		updated.Team = team
		updated.Notes = notes
		updated.Tags = tags
		m.nodes[i] = updated
		return updated, nil
	}

	return models.Node{}, ErrNodeNotFound
}

func (m *MemoryStore) DeleteNode(id string) (models.Node, error) {
	m.mu.Lock()
	defer m.mu.Unlock()

	nodeIdx := -1
	var deleted models.Node
	for i := range m.nodes {
		if m.nodes[i].ID == id {
			nodeIdx = i
			deleted = m.nodes[i]
			break
		}
	}
	if nodeIdx == -1 {
		return models.Node{}, ErrNodeNotFound
	}

	m.nodes = append(m.nodes[:nodeIdx], m.nodes[nodeIdx+1:]...)

	filtered := m.edges[:0]
	for _, e := range m.edges {
		if e.FromID == id || e.ToID == id {
			continue
		}
		filtered = append(filtered, e)
	}
	m.edges = filtered

	return deleted, nil
}

func (m *MemoryStore) AddEdge(e models.Edge) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	for _, x := range m.edges {
		if x.FromID == e.FromID && x.ToID == e.ToID && x.Type == e.Type {
			return ErrDuplicateEdge
		}
	}
	m.edges = append(m.edges, e)
	return nil
}

func (m *MemoryStore) DeleteEdge(id string) (models.Edge, error) {
	m.mu.Lock()
	defer m.mu.Unlock()

	for i := range m.edges {
		if m.edges[i].ID != id {
			continue
		}
		deleted := m.edges[i]
		m.edges = append(m.edges[:i], m.edges[i+1:]...)
		return deleted, nil
	}

	return models.Edge{}, ErrEdgeNotFound
}

func (m *MemoryStore) UpdateEdgeType(id, edgeType string) (models.Edge, error) {
	m.mu.Lock()
	defer m.mu.Unlock()

	for i := range m.edges {
		if m.edges[i].ID != id {
			continue
		}

		updated := m.edges[i]
		updated.Type = edgeType
		for j := range m.edges {
			if i == j {
				continue
			}
			x := m.edges[j]
			if x.FromID == updated.FromID && x.ToID == updated.ToID && x.Type == updated.Type {
				return models.Edge{}, ErrDuplicateEdge
			}
		}

		m.edges[i] = updated
		return updated, nil
	}

	return models.Edge{}, ErrEdgeNotFound
}

func (m *MemoryStore) NodeExists(id string) bool {
	m.mu.RLock()
	defer m.mu.RUnlock()
	for _, n := range m.nodes {
		if n.ID == id {
			return true
		}
	}
	return false
}

func (m *MemoryStore) SnapshotNodes() []models.Node {
	m.mu.RLock()
	defer m.mu.RUnlock()
	out := make([]models.Node, len(m.nodes))
	copy(out, m.nodes)
	return out
}

func (m *MemoryStore) SnapshotEdges() []models.Edge {
	m.mu.RLock()
	defer m.mu.RUnlock()
	out := make([]models.Edge, len(m.edges))
	copy(out, m.edges)
	return out
}

func (m *MemoryStore) Graph() models.Graph {
	m.mu.RLock()
	defer m.mu.RUnlock()
	gn := make([]models.Node, len(m.nodes))
	copy(gn, m.nodes)
	ge := make([]models.Edge, len(m.edges))
	copy(ge, m.edges)
	return models.Graph{Nodes: gn, Edges: ge}
}

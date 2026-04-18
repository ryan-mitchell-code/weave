// Package store holds graph data (nodes and edges) behind a swappable backend:
// in-memory (default) or Postgres when WEAVE_MODE=persist.
package store

import (
	"errors"

	"org-graph/internal/models"
)

var ErrDuplicateEdge = errors.New("duplicate edge")
var ErrEdgeNotFound = errors.New("edge not found")
var ErrNodeNotFound = errors.New("node not found")

// WeaveModePersist is the WEAVE_MODE value that selects Postgres-backed storage.
const WeaveModePersist = "persist"

// Backend is the storage implementation used by HTTP handlers (via package-level helpers).
type Backend interface {
	AddNode(n models.Node)
	UpdateNode(id, name, team, notes string, tags []string) (models.Node, error)
	DeleteNode(id string) (models.Node, error)
	AddEdge(e models.Edge) error
	DeleteEdge(id string) (models.Edge, error)
	UpdateEdgeType(id, edgeType string) (models.Edge, error)
	NodeExists(id string) bool
	SnapshotNodes() []models.Node
	SnapshotEdges() []models.Edge
	Graph() models.Graph
}

var backend Backend

// SetBackend installs the active store. Call once from main before serving HTTP.
func SetBackend(b Backend) {
	if b == nil {
		panic("store.SetBackend: nil backend")
	}
	backend = b
}

func AddNode(n models.Node)                         { backend.AddNode(n) }
func UpdateNode(id, name, team, notes string, tags []string) (models.Node, error) {
	return backend.UpdateNode(id, name, team, notes, tags)
}
func DeleteNode(id string) (models.Node, error) { return backend.DeleteNode(id) }
func AddEdge(e models.Edge) error               { return backend.AddEdge(e) }
func DeleteEdge(id string) (models.Edge, error) { return backend.DeleteEdge(id) }
func UpdateEdgeType(id, edgeType string) (models.Edge, error) {
	return backend.UpdateEdgeType(id, edgeType)
}
func NodeExists(id string) bool                { return backend.NodeExists(id) }
func SnapshotNodes() []models.Node             { return backend.SnapshotNodes() }
func SnapshotEdges() []models.Edge             { return backend.SnapshotEdges() }
func Graph() models.Graph                      { return backend.Graph() }

package models

type NodeType string

const (
	Person NodeType = "person"
)

type Node struct {
	ID    string   `json:"id"`
	Name  string   `json:"name"`
	Type  NodeType `json:"type"`
	Team  string   `json:"team"`
	Notes string   `json:"notes"`
	Tags  []string `json:"tags"`
}

package models

type NodeType string

const (
	Person NodeType = "person"
	Team   NodeType = "team"
)

type Node struct {
	ID    string   `json:"id"`
	Name  string   `json:"name"`
	Type  NodeType `json:"type"`
	Notes string   `json:"notes"`
}

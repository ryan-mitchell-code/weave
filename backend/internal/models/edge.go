package models

type Edge struct {
	ID     string `json:"id"`
	FromID string `json:"from_id"`
	ToID   string `json:"to_id"`
	Type   string `json:"type,omitempty"`
}

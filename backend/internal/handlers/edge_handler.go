package handlers

import (
	"encoding/json"
	"net/http"

	"org-graph/internal/models"
)

var edges []models.Edge

func CreateEdge(w http.ResponseWriter, r *http.Request) {
	var e models.Edge
	if err := json.NewDecoder(r.Body).Decode(&e); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	if e.FromID == "" || e.ToID == "" {
		http.Error(w, "from_id and to_id are required", http.StatusBadRequest)
		return
	}

	if !nodeExists(e.FromID) || !nodeExists(e.ToID) {
		http.Error(w, "from_id and to_id must reference existing nodes", http.StatusBadRequest)
		return
	}

	edges = append(edges, e)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(e)
}

func GetEdges(w http.ResponseWriter, r *http.Request) {
	json.NewEncoder(w).Encode(edges)
}

func nodeExists(id string) bool {
	for _, n := range nodes {
		if n.ID == id {
			return true
		}
	}
	return false
}

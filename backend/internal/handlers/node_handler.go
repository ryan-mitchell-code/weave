package handlers

import (
	"encoding/json"
	"net/http"

	"org-graph/internal/models"
)

var nodes []models.Node

func CreateNode(w http.ResponseWriter, r *http.Request) {
	var n models.Node
	if err := json.NewDecoder(r.Body).Decode(&n); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	nodes = append(nodes, n)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(n)
}

func GetNodes(w http.ResponseWriter, r *http.Request) {
	json.NewEncoder(w).Encode(nodes)
}
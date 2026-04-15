package handlers

import (
	"encoding/json"
	"net/http"
	"strings"

	"github.com/google/uuid"

	"org-graph/internal/models"
	"org-graph/internal/store"
)

func CreateNode(w http.ResponseWriter, r *http.Request) {
	var n models.Node
	if err := json.NewDecoder(r.Body).Decode(&n); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	n.Name = strings.TrimSpace(n.Name)
	n.Team = strings.TrimSpace(n.Team)
	if n.Name == "" {
		writeError(w, http.StatusBadRequest, "name is required")
		return
	}
	if n.Type == "" {
		n.Type = models.Person
	}
	if n.Type != models.Person {
		writeError(w, http.StatusBadRequest, "type must be person")
		return
	}

	n.ID = uuid.NewString()
	store.AddNode(n)

	writeJSON(w, http.StatusOK, n)
}

func GetNodes(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, store.SnapshotNodes())
}

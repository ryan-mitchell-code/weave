package handlers

import (
	"encoding/json"
	"errors"
	"net/http"
	"strings"

	"github.com/google/uuid"

	"org-graph/internal/models"
	"org-graph/internal/store"
)

func CreateEdge(w http.ResponseWriter, r *http.Request) {
	var e models.Edge
	if err := json.NewDecoder(r.Body).Decode(&e); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	e.FromID = strings.TrimSpace(e.FromID)
	e.ToID = strings.TrimSpace(e.ToID)
	if e.FromID == "" || e.ToID == "" {
		writeError(w, http.StatusBadRequest, "from_id and to_id are required")
		return
	}
	if e.FromID == e.ToID {
		writeError(w, http.StatusBadRequest, "an edge cannot connect a node to itself")
		return
	}

	e.Type = strings.TrimSpace(e.Type)
	if e.Type == "" {
		writeError(w, http.StatusBadRequest, "type is required")
		return
	}

	if !store.NodeExists(e.FromID) || !store.NodeExists(e.ToID) {
		writeError(w, http.StatusBadRequest, "from_id and to_id must reference existing nodes")
		return
	}

	e.ID = uuid.NewString()
	if err := store.AddEdge(e); err != nil {
		if errors.Is(err, store.ErrDuplicateEdge) {
			writeError(w, http.StatusBadRequest, "duplicate edge for the same from_id, to_id, and type")
			return
		}
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	writeJSON(w, http.StatusOK, e)
}

func GetEdges(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, store.SnapshotEdges())
}

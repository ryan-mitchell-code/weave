package handlers

import (
	"encoding/json"
	"errors"
	"net/http"

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

	if e.FromID == "" || e.ToID == "" {
		writeError(w, http.StatusBadRequest, "from_id and to_id are required")
		return
	}

	if !store.NodeExists(e.FromID) || !store.NodeExists(e.ToID) {
		writeError(w, http.StatusBadRequest, "from_id and to_id must reference existing nodes")
		return
	}

	e.ID = uuid.NewString()
	if err := store.AddEdge(e); err != nil {
		if errors.Is(err, store.ErrDuplicateEdge) {
			writeError(w, http.StatusBadRequest, "duplicate edge for the same from_id and to_id")
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

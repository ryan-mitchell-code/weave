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

func CreateNode(w http.ResponseWriter, r *http.Request) {
	var n models.Node
	if err := json.NewDecoder(r.Body).Decode(&n); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	n.Name = strings.TrimSpace(n.Name)
	n.Team = strings.TrimSpace(n.Team)
	n.Notes = strings.TrimSpace(n.Notes)
	n.Tags = normalizeTags(n.Tags)
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

type updateNodeRequest struct {
	ID    string `json:"id"`
	Name  string `json:"name"`
	Team  string `json:"team"`
	Notes string `json:"notes"`
	Tags  []string `json:"tags"`
}

func UpdateNode(w http.ResponseWriter, r *http.Request) {
	var req updateNodeRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	req.ID = strings.TrimSpace(req.ID)
	req.Name = strings.TrimSpace(req.Name)
	req.Team = strings.TrimSpace(req.Team)
	req.Notes = strings.TrimSpace(req.Notes)
	req.Tags = normalizeTags(req.Tags)
	if req.ID == "" || req.Name == "" {
		writeError(w, http.StatusBadRequest, "id and name are required")
		return
	}

	updated, err := store.UpdateNode(req.ID, req.Name, req.Team, req.Notes, req.Tags)
	if err != nil {
		if errors.Is(err, store.ErrNodeNotFound) {
			writeError(w, http.StatusNotFound, "node not found")
			return
		}
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	writeJSON(w, http.StatusOK, updated)
}

func normalizeTags(tags []string) []string {
	if len(tags) == 0 {
		return nil
	}
	seen := make(map[string]struct{}, len(tags))
	out := make([]string, 0, len(tags))
	for _, t := range tags {
		trimmed := strings.TrimSpace(t)
		if trimmed == "" {
			continue
		}
		key := strings.ToLower(trimmed)
		if _, ok := seen[key]; ok {
			continue
		}
		seen[key] = struct{}{}
		out = append(out, trimmed)
	}
	if len(out) == 0 {
		return nil
	}
	return out
}

type deleteNodeRequest struct {
	ID string `json:"id"`
}

func DeleteNode(w http.ResponseWriter, r *http.Request) {
	var req deleteNodeRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	req.ID = strings.TrimSpace(req.ID)
	if req.ID == "" {
		writeError(w, http.StatusBadRequest, "id is required")
		return
	}

	deleted, err := store.DeleteNode(req.ID)
	if err != nil {
		if errors.Is(err, store.ErrNodeNotFound) {
			writeError(w, http.StatusNotFound, "node not found")
			return
		}
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	writeJSON(w, http.StatusOK, deleted)
}

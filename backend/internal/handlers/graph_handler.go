package handlers

import (
	"net/http"

	"org-graph/internal/store"
)

func GetGraph(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, store.Graph())
}

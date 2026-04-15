package main

import (
	"log"
	"net/http"
	"org-graph/internal/handlers"
)

func main() {
	mux := http.NewServeMux()

	// Health check
	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte("ok"))
	})

	// Node routes
	mux.HandleFunc("/nodes", func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodGet:
			handlers.GetNodes(w, r)
		case http.MethodPost:
			handlers.CreateNode(w, r)
		case http.MethodPatch:
			handlers.UpdateNode(w, r)
		case http.MethodDelete:
			handlers.DeleteNode(w, r)
		default:
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		}
	})

	// Edge routes
	mux.HandleFunc("/edges", func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodGet:
			handlers.GetEdges(w, r)
		case http.MethodPost:
			handlers.CreateEdge(w, r)
		case http.MethodPatch:
			handlers.UpdateEdgeType(w, r)
		default:
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		}
	})

	// Graph snapshot
	mux.HandleFunc("/graph", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}
		handlers.GetGraph(w, r)
	})

	log.Println("Server running on :8080")
	log.Fatal(http.ListenAndServe(":8080", mux))
}

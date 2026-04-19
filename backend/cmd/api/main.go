package main

import (
	"log"
	"net/http"
	"net/url"
	"os"
	"strings"

	"org-graph/internal/handlers"
	"org-graph/internal/store"
)

func main() {
	mode := strings.TrimSpace(os.Getenv("WEAVE_MODE"))
	if mode == store.WeaveModePersist {
		dsn := strings.TrimSpace(os.Getenv("DATABASE_URL"))
		if dsn == "" {
			log.Fatal("WEAVE_MODE=persist requires DATABASE_URL")
		}
		log.Println("Using Postgres store (persist mode)")
		log.Printf("DATABASE_URL (masked): %s", maskDatabaseURL(dsn))
		ps, err := store.OpenPostgres(dsn)
		if err != nil {
			log.Fatalf("postgres: %v", err)
		}
		store.SetBackend(ps)
	} else {
		store.SetBackend(store.NewMemoryStore())
		log.Println("Using in-memory store")
	}

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
		case http.MethodDelete:
			handlers.DeleteEdge(w, r)
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

	mux.HandleFunc("/search", handlers.Search)

	log.Println("Server running on :8080")
	log.Fatal(http.ListenAndServe(":8080", mux))
}

// maskDatabaseURL returns a copy of dsn safe to log (password redacted).
// Non-URL DSN strings (e.g. lib/pq keyword format) are not parsed and are not logged verbatim.
func maskDatabaseURL(dsn string) string {
	u, err := url.Parse(dsn)
	if err != nil {
		return "<unparseable DATABASE_URL>"
	}
	return u.Redacted()
}

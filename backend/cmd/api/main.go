package main

import (
	"log"
	"net"
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
		dsn := resolveDatabaseURL()
		if dsn == "" {
			log.Fatal("WEAVE_MODE=persist requires DATABASE_URL, or POSTGRES_USER + POSTGRES_PASSWORD + POSTGRES_DB (host defaults to localhost:5432)")
		}
		warnIfPostgresUserMismatch(dsn)
		log.Println("Using Postgres store (persist mode)")
		if strings.TrimSpace(os.Getenv("DATABASE_URL")) == "" {
			log.Println("DATABASE_URL unset; built connection string from POSTGRES_*")
		}
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

// resolveDatabaseURL returns DATABASE_URL if set; otherwise builds a postgres URL from
// POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB, and optional POSTGRES_HOST / POSTGRES_PORT
// (defaults localhost:5432). Docker Compose reads POSTGRES_* for the container; this lets
// the same .env drive the Go client without duplicating the username in DATABASE_URL.
func resolveDatabaseURL() string {
	explicit := strings.TrimSpace(os.Getenv("DATABASE_URL"))
	if explicit != "" {
		return explicit
	}
	user := strings.TrimSpace(os.Getenv("POSTGRES_USER"))
	pass := strings.TrimSpace(os.Getenv("POSTGRES_PASSWORD"))
	db := strings.TrimSpace(os.Getenv("POSTGRES_DB"))
	if user == "" || pass == "" || db == "" {
		return ""
	}
	host := strings.TrimSpace(os.Getenv("POSTGRES_HOST"))
	if host == "" {
		host = "localhost"
	}
	port := strings.TrimSpace(os.Getenv("POSTGRES_PORT"))
	if port == "" {
		port = "5432"
	}
	u := &url.URL{
		Scheme: "postgres",
		User:   url.UserPassword(user, pass),
		Host:   net.JoinHostPort(host, port),
		Path:   "/" + db,
	}
	q := url.Values{}
	q.Set("sslmode", "disable")
	u.RawQuery = q.Encode()
	return u.String()
}

func warnIfPostgresUserMismatch(dsn string) {
	explicit := strings.TrimSpace(os.Getenv("DATABASE_URL"))
	want := strings.TrimSpace(os.Getenv("POSTGRES_USER"))
	if explicit == "" || want == "" {
		return
	}
	parsed, err := url.Parse(dsn)
	if err != nil || parsed.User == nil {
		return
	}
	if urlUser := parsed.User.Username(); urlUser != "" && urlUser != want {
		log.Printf("warning: DATABASE_URL uses db user %q but POSTGRES_USER is %q — connection uses DATABASE_URL. Update the URL or remove DATABASE_URL to build from POSTGRES_*.",
			urlUser, want)
	}
}

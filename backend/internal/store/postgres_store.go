package store

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"log"

	"github.com/lib/pq"

	"org-graph/internal/models"
)

// Pool sizing for dev/single-user API process (tune here if concurrency grows).
const (
	pgMaxOpenConns = 10
	pgMaxIdleConns = 5
)

// Single source of truth for SELECT/RETURNING column lists (avoid drift when extending schema).
const (
	sqlNodeCols = "id, name, type, team, notes, tags"
	sqlEdgeCols = "id, from_id, to_id, type"
)

// PostgresStore persists nodes and edges in PostgreSQL.
type PostgresStore struct {
	db *sql.DB
}

// OpenPostgres connects using DATABASE_URL-style DSN, verifies the connection,
// and creates tables if missing.
func OpenPostgres(dsn string) (*PostgresStore, error) {
	db, err := sql.Open("postgres", dsn)
	if err != nil {
		return nil, err
	}
	db.SetMaxOpenConns(pgMaxOpenConns)
	db.SetMaxIdleConns(pgMaxIdleConns)
	if err := db.Ping(); err != nil {
		_ = db.Close()
		return nil, fmt.Errorf("ping database: %w", err)
	}
	s := &PostgresStore{db: db}
	if err := s.ensureSchema(); err != nil {
		_ = db.Close()
		return nil, err
	}
	return s, nil
}

func (p *PostgresStore) ensureSchema() error {
	const nodesDDL = `
CREATE TABLE IF NOT EXISTS nodes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  team TEXT,
  notes TEXT,
  tags TEXT[]
);`
	const edgesDDL = `
CREATE TABLE IF NOT EXISTS edges (
  id TEXT PRIMARY KEY,
  from_id TEXT NOT NULL,
  to_id TEXT NOT NULL,
  type TEXT NOT NULL
);`
	ctx := context.Background()
	if _, err := p.db.ExecContext(ctx, nodesDDL); err != nil {
		return fmt.Errorf("create nodes table: %w", err)
	}
	if _, err := p.db.ExecContext(ctx, edgesDDL); err != nil {
		return fmt.Errorf("create edges table: %w", err)
	}
	return nil
}

func (p *PostgresStore) AddNode(n models.Node) {
	ctx := context.Background()
	tags := tagsForDB(n.Tags)
	_, err := p.db.ExecContext(ctx,
		`INSERT INTO nodes (`+sqlNodeCols+`) VALUES ($1, $2, $3, $4, $5, $6)`,
		n.ID, n.Name, string(n.Type), nullIfEmpty(n.Team), nullIfEmpty(n.Notes), pq.Array(tags),
	)
	if err != nil {
		log.Printf("store: postgres AddNode failed (node id=%q name=%q): %v", n.ID, n.Name, err)
		return
	}
}

func (p *PostgresStore) UpdateNode(id, name, team, notes string, tags []string) (models.Node, error) {
	ctx := context.Background()
	tags = tagsForDB(tags)
	res, err := p.db.ExecContext(ctx,
		`UPDATE nodes SET name = $2, team = $3, notes = $4, tags = $5 WHERE id = $1`,
		id, name, nullIfEmpty(team), nullIfEmpty(notes), pq.Array(tags),
	)
	if err != nil {
		return models.Node{}, err
	}
	affected, err := res.RowsAffected()
	if err != nil {
		return models.Node{}, err
	}
	if affected == 0 {
		return models.Node{}, ErrNodeNotFound
	}
	return p.nodeByID(ctx, id)
}

func (p *PostgresStore) DeleteNode(id string) (models.Node, error) {
	ctx := context.Background()
	tx, err := p.db.BeginTx(ctx, nil)
	if err != nil {
		return models.Node{}, err
	}
	defer func() { _ = tx.Rollback() }()

	if _, err := tx.ExecContext(ctx, `DELETE FROM edges WHERE from_id = $1 OR to_id = $1`, id); err != nil {
		return models.Node{}, err
	}
	row := tx.QueryRowContext(ctx,
		`DELETE FROM nodes WHERE id = $1 RETURNING `+sqlNodeCols, id,
	)
	n, err := scanNode(row)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return models.Node{}, ErrNodeNotFound
		}
		return models.Node{}, err
	}
	if err := tx.Commit(); err != nil {
		return models.Node{}, err
	}
	return n, nil
}

func (p *PostgresStore) AddEdge(e models.Edge) error {
	ctx := context.Background()
	tx, err := p.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback() }()

	var dup int
	err = tx.QueryRowContext(ctx,
		`SELECT 1 FROM edges WHERE from_id = $1 AND to_id = $2 AND type = $3 LIMIT 1`,
		e.FromID, e.ToID, e.Type,
	).Scan(&dup)
	if err == nil {
		return ErrDuplicateEdge
	}
	if !errors.Is(err, sql.ErrNoRows) {
		return err
	}

	if _, err := tx.ExecContext(ctx,
		`INSERT INTO edges (`+sqlEdgeCols+`) VALUES ($1, $2, $3, $4)`,
		e.ID, e.FromID, e.ToID, e.Type,
	); err != nil {
		return err
	}
	return tx.Commit()
}

func (p *PostgresStore) DeleteEdge(id string) (models.Edge, error) {
	ctx := context.Background()
	row := p.db.QueryRowContext(ctx,
		`DELETE FROM edges WHERE id = $1 RETURNING `+sqlEdgeCols, id,
	)
	var e models.Edge
	err := row.Scan(&e.ID, &e.FromID, &e.ToID, &e.Type)
	if errors.Is(err, sql.ErrNoRows) {
		return models.Edge{}, ErrEdgeNotFound
	}
	if err != nil {
		return models.Edge{}, err
	}
	return e, nil
}

func (p *PostgresStore) UpdateEdgeType(id, edgeType string) (models.Edge, error) {
	ctx := context.Background()
	tx, err := p.db.BeginTx(ctx, nil)
	if err != nil {
		return models.Edge{}, err
	}
	defer func() { _ = tx.Rollback() }()

	var cur models.Edge
	row := tx.QueryRowContext(ctx,
		`SELECT `+sqlEdgeCols+` FROM edges WHERE id = $1`, id,
	)
	if err := row.Scan(&cur.ID, &cur.FromID, &cur.ToID, &cur.Type); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return models.Edge{}, ErrEdgeNotFound
		}
		return models.Edge{}, err
	}

	var dupID string
	err = tx.QueryRowContext(ctx,
		`SELECT id FROM edges WHERE from_id = $1 AND to_id = $2 AND type = $3 AND id <> $4 LIMIT 1`,
		cur.FromID, cur.ToID, edgeType, id,
	).Scan(&dupID)
	if err == nil {
		return models.Edge{}, ErrDuplicateEdge
	}
	if !errors.Is(err, sql.ErrNoRows) {
		return models.Edge{}, err
	}

	row = tx.QueryRowContext(ctx,
		`UPDATE edges SET type = $2 WHERE id = $1 RETURNING `+sqlEdgeCols,
		id, edgeType,
	)
	var updated models.Edge
	if err := row.Scan(&updated.ID, &updated.FromID, &updated.ToID, &updated.Type); err != nil {
		return models.Edge{}, err
	}
	if err := tx.Commit(); err != nil {
		return models.Edge{}, err
	}
	return updated, nil
}

func (p *PostgresStore) NodeExists(id string) bool {
	ctx := context.Background()
	var one int
	err := p.db.QueryRowContext(ctx, `SELECT 1 FROM nodes WHERE id = $1 LIMIT 1`, id).Scan(&one)
	return err == nil
}

func (p *PostgresStore) SnapshotNodes() []models.Node {
	ctx := context.Background()
	rows, err := p.db.QueryContext(ctx,
		`SELECT `+sqlNodeCols+` FROM nodes ORDER BY name, id`,
	)
	if err != nil {
		log.Printf("store: postgres SnapshotNodes query failed: %v", err)
		return []models.Node{}
	}
	defer rows.Close()
	out, scanErr := scanNodes(rows)
	if scanErr != nil {
		log.Printf("store: postgres SnapshotNodes scan failed: %v", scanErr)
	}
	return out
}

func (p *PostgresStore) SnapshotEdges() []models.Edge {
	ctx := context.Background()
	rows, err := p.db.QueryContext(ctx,
		`SELECT `+sqlEdgeCols+` FROM edges ORDER BY id`,
	)
	if err != nil {
		log.Printf("store: postgres SnapshotEdges query failed: %v", err)
		return []models.Edge{}
	}
	defer rows.Close()
	out, scanErr := scanEdges(rows)
	if scanErr != nil {
		log.Printf("store: postgres SnapshotEdges scan failed: %v", scanErr)
	}
	return out
}

func (p *PostgresStore) Graph() models.Graph {
	return models.Graph{
		Nodes: p.SnapshotNodes(),
		Edges: p.SnapshotEdges(),
	}
}

func (p *PostgresStore) nodeByID(ctx context.Context, id string) (models.Node, error) {
	row := p.db.QueryRowContext(ctx,
		`SELECT `+sqlNodeCols+` FROM nodes WHERE id = $1`, id,
	)
	return scanNode(row)
}

func scanNode(scanner interface{ Scan(dest ...any) error }) (models.Node, error) {
	var n models.Node
	var typ string
	var team, notes sql.NullString
	var tags pq.StringArray
	if err := scanner.Scan(&n.ID, &n.Name, &typ, &team, &notes, &tags); err != nil {
		return models.Node{}, err
	}
	n.Type = models.NodeType(typ)
	n.Team = team.String
	n.Notes = notes.String
	if len(tags) > 0 {
		n.Tags = []string(tags)
	} else {
		n.Tags = nil
	}
	return n, nil
}

func scanNodes(rows *sql.Rows) ([]models.Node, error) {
	var out []models.Node
	for rows.Next() {
		n, err := scanNode(rows)
		if err != nil {
			return out, err
		}
		out = append(out, n)
	}
	return out, rows.Err()
}

func scanEdges(rows *sql.Rows) ([]models.Edge, error) {
	var out []models.Edge
	for rows.Next() {
		var e models.Edge
		if err := rows.Scan(&e.ID, &e.FromID, &e.ToID, &e.Type); err != nil {
			return out, err
		}
		out = append(out, e)
	}
	return out, rows.Err()
}

func tagsForDB(tags []string) []string {
	if tags == nil {
		return []string{}
	}
	return tags
}

func nullIfEmpty(s string) any {
	if s == "" {
		return nil
	}
	return s
}

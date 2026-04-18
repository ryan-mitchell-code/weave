# Local PostgreSQL (development)

This repo includes a minimal **Docker Compose** setup so you can run **PostgreSQL 15** locally. Credentials are **not** hardcoded in `docker-compose.yml`; Compose substitutes values from your environment (use a **`.env`** file at the repo root — see below).

## 1. Configure environment

Copy the example env file and edit:

```bash
cp .env.example .env
```

- **`POSTGRES_*`** — Used by **Docker** to create the database and superuser.
- **`DATABASE_URL`** — Used by the **Go API** only. The user (after `postgres://`), password, and database path must match **`POSTGRES_USER`**, **`POSTGRES_PASSWORD`**, and **`POSTGRES_DB`**.

If you change **`POSTGRES_PASSWORD`** or **`POSTGRES_USER`**, update **`DATABASE_URL`** the same way.

If you change credentials **after** the data volume was first created, Postgres still has the old roles/passwords until **`docker compose down -v`** and **`docker compose up -d`** (wipes data) or you keep **`DATABASE_URL`** aligned with what the volume was initialized with.

Passwords with **`@` `:` `/` `#`** in them must be **URL-encoded** in **`DATABASE_URL`** (e.g. `@` → **`%40`**).

Keep **`.env`** local only; it is **gitignored**.

The Go binary does not read **`.env`** by itself — export vars or use **`backend/run-with-env.sh`** (sources **`../.env`** then **`go run`**).

## 2. Start the database

From the **repository root**:

```bash
docker compose up -d
```

Docker Compose loads variables from **`.env`** in the same directory by default.

## 3. Stop the database

Containers stop but the data volume is kept:

```bash
docker compose down
```

## 4. Connect with `psql`

```bash
docker exec -it weave-postgres psql -U postgres -d weave
```

Use your **`POSTGRES_USER`** / **`POSTGRES_DB`** if you changed them from **`postgres`** / **`weave`**.

## 5. Reset the database (wipe all data)

Removes containers **and** the named volume (`weave_pgdata`):

```bash
docker compose down -v
```

The next `docker compose up -d` starts with an empty data directory.

## Persistence

Postgres data is stored in a Docker **named volume** (`weave_pgdata`), mapped to `/var/lib/postgresql/data` in the container. That volume survives `docker compose stop` and `docker compose down` (without `-v`). Use `docker compose down -v` when you need a clean slate.

## Port

Host **5432** is mapped to the container. If another process uses 5432, adjust the **host** port in `docker-compose.yml` locally only.

## Troubleshooting: `password authentication failed`

1. **`DATABASE_URL`** user and password must match **`POSTGRES_USER`** and **`POSTGRES_PASSWORD`**.
2. If you changed **`POSTGRES_*`** after the volume existed, **`docker compose down -v`** then **`docker compose up -d`**, or fix **`DATABASE_URL`** to match the existing cluster.
3. URL-encode special characters in the password (see section 1).

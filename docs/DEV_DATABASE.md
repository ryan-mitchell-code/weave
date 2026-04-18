# Local PostgreSQL (development)

This repo includes a minimal **Docker Compose** setup so you can run **PostgreSQL 15** locally. Credentials are **not** hardcoded in `docker-compose.yml`; Compose substitutes values from your environment (use a **`.env`** file at the repo root — see below).

## 1. Configure environment

Copy the example env file and set a real password:

```bash
cp .env.example .env
```

Edit **`.env`** and set **`POSTGRES_PASSWORD`** to a strong secret. **Always keep `DATABASE_URL` in sync:** the username, password, database name, host, and port in the URL must match what Postgres uses. A common mistake is changing **`POSTGRES_PASSWORD`** but leaving **`DATABASE_URL`** on the old password (e.g. `changeme`) — the Go app will fail with **password authentication failed**.

If you change Postgres credentials after the volume already exists, the data directory still has the **old** password until you run **`docker compose down -v`** and bring the stack up again (this wipes data).

Passwords with characters like **`@` `:` `/` `#`** must be **URL-encoded** inside **`DATABASE_URL`** (e.g. `@` → **`%40`**).

Keep **`.env`** local only; it is listed in **`.gitignore`** and must not be committed.

The **Go API** does not read this file. For **`WEAVE_MODE=persist`**, export **`DATABASE_URL`** (and **`WEAVE_MODE`**) in your shell before `go run`, use **`set -a && source .env && set +a`** from the repo root, or from **`backend/`** run **`./run-with-env.sh`** (loads **`../.env`** then starts the API).

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

If you changed **`POSTGRES_USER`** or **`POSTGRES_DB`** in **`.env`**, use those values instead of `postgres` / `weave`.

## 5. Reset the database (wipe all data)

Removes containers **and** the named volume (`weave_pgdata`):

```bash
docker compose down -v
```

The next `docker compose up -d` starts with an empty data directory.

## Persistence

Postgres data is stored in a Docker **named volume** (`weave_pgdata`), mounted at `/var/lib/postgresql/data` in the container. That volume survives `docker compose stop` and `docker compose down` (without `-v`). Use `docker compose down -v` when you need a clean slate.

## Port

Host **5432** is mapped to the container. If another process uses 5432, adjust the **host** port in `docker-compose.yml` locally only.

## Troubleshooting: `password authentication failed`

1. Open **`.env`** and confirm the password in **`DATABASE_URL`** (between `:` and `@`) equals **`POSTGRES_PASSWORD`**.
2. If you just changed the password, either update **`DATABASE_URL`** to match the **existing** volume’s password, or reset the volume: **`docker compose down -v`** then **`docker compose up -d`** (re-initializes Postgres with the new **`POSTGRES_PASSWORD`**; **all data is lost**).
3. Encode special characters in the password for the URL (see section 1 above).

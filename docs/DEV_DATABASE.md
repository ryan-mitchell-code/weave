# Local PostgreSQL (development)

This repo includes a minimal **Docker Compose** setup so you can run **PostgreSQL 15** locally. Credentials are **not** hardcoded in `docker-compose.yml`; Compose substitutes values from your environment (use a **`.env`** file at the repo root — see below).

## 1. Configure environment

Copy the example env file and set a real password:

```bash
cp .env.example .env
```

Edit **`.env`** and set **`POSTGRES_PASSWORD`** to a strong secret. **Always keep `DATABASE_URL` in sync:** the **user** in the URL (immediately after `postgres://`, before `:`) must equal **`POSTGRES_USER`**. The **password**, **database** (`/weave` before `?`), host, and port must match **`POSTGRES_PASSWORD`**, **`POSTGRES_DB`**, and your Compose port. A common mistake is setting **`POSTGRES_USER=ryan`** but leaving **`DATABASE_URL`** as `postgres://postgres:...` — the app will connect as **`postgres`** and fail. Another is changing **`POSTGRES_PASSWORD`** but not updating the password in **`DATABASE_URL`**.

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

1. Open **`.env`**. The login name in **`DATABASE_URL`** must match **`POSTGRES_USER`** (e.g. both **`ryan`** or both **`postgres`**).
2. Confirm the password in **`DATABASE_URL`** (between `:` and `@`) equals **`POSTGRES_PASSWORD`**.
3. If you changed **`POSTGRES_USER`** or **`POSTGRES_PASSWORD`** after the volume was first created, Postgres still has the **old** superuser/password until you **`docker compose down -v`** then **`docker compose up -d`** (**data loss**) or you align **`DATABASE_URL`** with whatever the volume was initialized with.
4. Encode special characters in the password for the URL (see section 1 above).

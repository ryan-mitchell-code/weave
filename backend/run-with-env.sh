#!/usr/bin/env bash
# Load repo-root .env into the environment, then start the API.
# Run from anywhere: ./run-with-env.sh or bash run-with-env.sh (cwd should be backend/).
set -euo pipefail
cd "$(dirname "$0")"
env_file="../.env"
if [[ ! -f "$env_file" ]]; then
	echo "run-with-env.sh: missing ${env_file} — copy .env.example to .env at the repo root." >&2
	exit 1
fi
set -a
# shellcheck source=/dev/null
source "$env_file"
set +a
exec go run ./cmd/api

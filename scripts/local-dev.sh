#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${ENV_FILE:-$ROOT_DIR/.env.local}"
RUN_DIR="$ROOT_DIR/.local-dev"
PID_DIR="$RUN_DIR/pids"
LOG_DIR="$RUN_DIR/logs"

COMPOSE_FILES=(-f "$ROOT_DIR/docker-compose.yml" -f "$ROOT_DIR/docker-compose.local.yml")
INFRA_SERVICES=(postgres neo4j broker schema-registry)

APP_NAMES=(discovery-server user-service connections-service posts-service notification-service api-gateway)
APP_DIRS=(discovery-server user-service connections-service posts-service notification-service api-gateway)
APP_PORTS=(8761 9020 9030 9010 9070 8007)

load_env() {
  if [[ ! -f "$ENV_FILE" ]]; then
    cat >&2 <<EOF
Missing $ENV_FILE

Create it first:
  cp .env.local.example .env.local

Then edit .env.local with your local credentials.
EOF
    exit 1
  fi

  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a

  for var in secret dbuserId dbuserpwd neoUserId neoPwd; do
    if [[ -z "${!var:-}" ]]; then
      echo "Missing required env var: $var" >&2
      exit 1
    fi
  done
}

port_open() {
  local port="$1"
  (echo >"/dev/tcp/127.0.0.1/$port") >/dev/null 2>&1
}

wait_for_port() {
  local name="$1"
  local port="$2"
  local timeout="${3:-90}"
  local elapsed=0

  printf "Waiting for %s on port %s" "$name" "$port"
  until port_open "$port"; do
    if (( elapsed >= timeout )); then
      echo
      echo "Timed out waiting for $name on port $port" >&2
      exit 1
    fi
    printf "."
    sleep 1
    elapsed=$((elapsed + 1))
  done
  echo " ready"
}

wait_for_http() {
  local name="$1"
  local url="$2"
  local timeout="${3:-90}"
  local elapsed=0

  printf "Waiting for %s" "$name"
  until curl -fsS "$url" >/dev/null 2>&1; do
    if (( elapsed >= timeout )); then
      echo
      echo "Timed out waiting for $name at $url" >&2
      exit 1
    fi
    printf "."
    sleep 1
    elapsed=$((elapsed + 1))
  done
  echo " ready"
}

ensure_docker() {
  if docker info >/dev/null 2>&1; then
    return
  fi

  if command -v colima >/dev/null 2>&1; then
    echo "Docker is not running. Starting Colima..."
    colima start
    docker context use colima >/dev/null 2>&1 || true
    return
  fi

  if [[ "$(uname -s)" == "Darwin" ]] && command -v open >/dev/null 2>&1; then
    echo "Docker is not running. Starting Docker Desktop in the background..."
    open -gja Docker || true
    local elapsed=0
    until docker info >/dev/null 2>&1; do
      if (( elapsed >= 120 )); then
        echo "Timed out waiting for Docker. Start Docker Desktop or use Colima, then retry." >&2
        exit 1
      fi
      sleep 2
      elapsed=$((elapsed + 2))
    done
    return
  fi

  echo "Docker is not running. Start your Docker daemon, then retry." >&2
  exit 1
}

start_infra() {
  ensure_docker

  echo "Starting Postgres, Neo4j, Kafka broker, and Schema Registry..."
  docker compose "${COMPOSE_FILES[@]}" up -d "${INFRA_SERVICES[@]}"

  wait_for_port "Postgres" 5432 90
  wait_for_port "Neo4j Browser" 7474 120
  wait_for_port "Neo4j Bolt" 7687 120
  wait_for_port "Kafka broker" 9092 120
  wait_for_http "Schema Registry" "http://127.0.0.1:8081/subjects" 120
}

pid_alive() {
  local pid_file="$1"
  [[ -f "$pid_file" ]] && kill -0 "$(cat "$pid_file")" >/dev/null 2>&1
}

tmux_session_name() {
  local name="$1"
  echo "collabsphere-$name"
}

tmux_session_exists() {
  local session="$1"
  command -v tmux >/dev/null 2>&1 && tmux has-session -t "$session" >/dev/null 2>&1
}

start_app() {
  local name="$1"
  local dir="$2"
  local port="$3"
  local pid_file="$PID_DIR/$name.pid"
  local log_file="$LOG_DIR/$name.log"
  local jar_file="$ROOT_DIR/$dir/target/$dir-0.0.1-SNAPSHOT.jar"
  local tmux_session
  tmux_session="$(tmux_session_name "$name")"

  if tmux_session_exists "$tmux_session"; then
    echo "$name already running in tmux session $tmux_session"
    return
  fi

  if pid_alive "$pid_file"; then
    echo "$name already running with pid $(cat "$pid_file")"
    return
  fi

  if port_open "$port"; then
    echo "$name port $port is already in use; assuming it is running outside this script"
    return
  fi

  echo "Building $name..."
  (cd "$ROOT_DIR/$dir" && ./mvnw -DskipTests package >"$LOG_DIR/$name-build.log" 2>&1)

  if [[ ! -f "$jar_file" ]]; then
    echo "Expected jar was not created: $jar_file" >&2
    echo "Build log: $LOG_DIR/$name-build.log" >&2
    exit 1
  fi

  echo "Starting $name..."
  if command -v tmux >/dev/null 2>&1; then
    tmux new-session -d -s "$tmux_session" -c "$ROOT_DIR/$dir" "exec java -jar \"$jar_file\" >\"$log_file\" 2>&1"
    tmux display-message -p -t "$tmux_session" "#{pane_pid}" >"$pid_file"
  else
    (
      cd "$ROOT_DIR/$dir"
      nohup java -jar "$jar_file" >"$log_file" 2>&1 &
      echo $! >"$pid_file"
    )
  fi

  wait_for_port "$name" "$port" 180
}

start_apps() {
  mkdir -p "$PID_DIR" "$LOG_DIR"

  for i in "${!APP_NAMES[@]}"; do
    start_app "${APP_NAMES[$i]}" "${APP_DIRS[$i]}" "${APP_PORTS[$i]}"
  done
}

stop_apps() {
  mkdir -p "$PID_DIR"

  for name in "${APP_NAMES[@]}"; do
    local pid_file="$PID_DIR/$name.pid"
    local tmux_session
    tmux_session="$(tmux_session_name "$name")"

    if tmux_session_exists "$tmux_session"; then
      echo "Stopping $name tmux session $tmux_session"
      tmux kill-session -t "$tmux_session" || true
    fi

    if pid_alive "$pid_file"; then
      echo "Stopping $name pid $(cat "$pid_file")"
      kill "$(cat "$pid_file")" || true
    fi
    rm -f "$pid_file"
  done
}

stop_infra() {
  echo "Stopping compose infra..."
  docker compose "${COMPOSE_FILES[@]}" stop "${INFRA_SERVICES[@]}"
}

status() {
  echo "Spring services:"
  for i in "${!APP_NAMES[@]}"; do
    local name="${APP_NAMES[$i]}"
    local port="${APP_PORTS[$i]}"
    local pid_file="$PID_DIR/$name.pid"
    local tmux_session
    tmux_session="$(tmux_session_name "$name")"

    if tmux_session_exists "$tmux_session"; then
      echo "  $name: tmux $tmux_session, port $port"
    elif pid_alive "$pid_file"; then
      echo "  $name: pid $(cat "$pid_file"), port $port"
    elif port_open "$port"; then
      echo "  $name: running outside script, port $port"
    else
      echo "  $name: stopped"
    fi
  done

  echo
  echo "Compose infra:"
  docker compose "${COMPOSE_FILES[@]}" ps "${INFRA_SERVICES[@]}" || true
}

show_logs() {
  local name="${1:-}"
  if [[ -z "$name" ]]; then
    echo "Usage: $0 logs <service-name>" >&2
    echo "Services: ${APP_NAMES[*]}" >&2
    exit 1
  fi
  tail -f "$LOG_DIR/$name.log"
}

usage() {
  cat <<EOF
Usage:
  $0 start        Start infra and Spring services
  $0 stop         Stop Spring services started by this script
  $0 stop --infra Stop Spring services and compose infra
  $0 restart      Stop then start everything
  $0 status       Show local status
  $0 logs <name>  Tail one Spring service log

Environment:
  Reads $ENV_FILE by default.
EOF
}

main() {
  local command="${1:-start}"
  case "$command" in
    start)
      load_env
      start_infra
      start_apps
      status
      ;;
    stop)
      load_env
      stop_apps
      if [[ "${2:-}" == "--infra" ]]; then
        stop_infra
      fi
      ;;
    restart)
      load_env
      stop_apps
      start_infra
      start_apps
      status
      ;;
    status)
      load_env
      status
      ;;
    logs)
      show_logs "${2:-}"
      ;;
    *)
      usage
      exit 1
      ;;
  esac
}

main "$@"

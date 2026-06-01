#!/usr/bin/env bash
# CollabSphere — local development orchestrator
# Usage: ./scripts/local-dev.sh [start|stop|restart|status|logs|ui] [options]
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${ENV_FILE:-$ROOT_DIR/.env.local}"
RUN_DIR="$ROOT_DIR/.local-dev"
PID_DIR="$RUN_DIR/pids"
LOG_DIR="$RUN_DIR/logs"

COMPOSE_FILES=(-f "$ROOT_DIR/docker-compose.yml" -f "$ROOT_DIR/docker-compose.local.yml")
INFRA_SERVICES=(postgres neo4j mongodb broker schema-registry)

# ── Spring Boot services (name  dir  port) ──────────────────────────────────
SPRING_NAMES=(discovery-server user-service connections-service posts-service api-gateway)
SPRING_DIRS=(discovery-server  user-service connections-service posts-service api-gateway)
SPRING_PORTS=(8761              9020         9030                9010          8007)

# ── Node.js services (name  dir  port) ─────────────────────────────────────
NODE_NAMES=(spheres-service)
NODE_DIRS=(spheres-service)
NODE_PORTS=(8009)

# ── Go services (name  dir  port) ───────────────────────────────────────────
GO_NAMES=(messages-service)
GO_DIRS=(messages-service)
GO_PORTS=(8010)

# ── Python services (name  dir  port) ───────────────────────────────────────
PY_NAMES=(notification-service)
PY_DIRS=(notification-service)
PY_PORTS=(9070)

# ── UI ───────────────────────────────────────────────────────────────────────
UI_DIR="$ROOT_DIR/collabsphere-ui"
UI_PORT="${UI_PORT:-3000}"

# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

load_env() {
  if [[ ! -f "$ENV_FILE" ]]; then
    cat >&2 <<EOF

  Missing $ENV_FILE

  Copy the template and edit it:
    cp .env.local.example .env.local

  Required variables: secret  dbuserId  dbuserpwd  neoUserId  neoPwd

EOF
    exit 1
  fi

  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a

  for var in secret dbuserId dbuserpwd neoUserId neoPwd; do
    if [[ -z "${!var:-}" ]]; then
      echo "ERROR: missing required env var '$var' in $ENV_FILE" >&2
      exit 1
    fi
  done

  if [[ -z "${SEED_DEFAULT_PASSWORD:-}" ]]; then
    echo "  ⚠️  SEED_DEFAULT_PASSWORD not set — user-service will start without seeding demo accounts"
    echo "     Add SEED_DEFAULT_PASSWORD=<password> to $ENV_FILE to enable seeding"
  fi
}

port_open() {
  (echo >"/dev/tcp/127.0.0.1/$1") >/dev/null 2>&1
}

wait_for_port() {
  local name="$1" port="$2" timeout="${3:-120}" elapsed=0
  printf "  ⏳ Waiting for %-28s" "$name …"
  until port_open "$port"; do
    if (( elapsed >= timeout )); then
      echo " TIMEOUT"
      echo "ERROR: $name did not start on port $port within ${timeout}s" >&2
      echo "  Log: $LOG_DIR/$name.log" >&2
      exit 1
    fi
    printf "."
    sleep 1
    elapsed=$((elapsed + 1))
  done
  echo " ✓"
}

wait_for_http() {
  local name="$1" url="$2" timeout="${3:-120}" elapsed=0
  printf "  ⏳ Waiting for %-28s" "$name …"
  until curl -fsS "$url" >/dev/null 2>&1; do
    if (( elapsed >= timeout )); then
      echo " TIMEOUT"
      echo "ERROR: $name did not respond at $url" >&2
      exit 1
    fi
    printf "."
    sleep 1
    elapsed=$((elapsed + 1))
  done
  echo " ✓"
}

install_node_deps() {
  local dir="$1" name="$2"

  if [[ -d "$dir/node_modules" ]]; then
    return
  fi

  echo "  Installing $name dependencies ..."
  if [[ -f "$dir/package-lock.json" ]]; then
    (cd "$dir" && npm ci --silent)
  else
    (cd "$dir" && npm install --silent)
  fi
}

pid_alive() {
  [[ -f "$1" ]] && kill -0 "$(cat "$1")" >/dev/null 2>&1
}

# Kill any process listening on a TCP port (last-resort fallback for "external" processes).
kill_by_port() {
  local port="$1" name="$2"
  local pids; pids="$(lsof -ti tcp:"$port" -s TCP:LISTEN 2>/dev/null || true)"
  [[ -z "$pids" ]] && return
  echo "  Stopping $name (external, port $port, pids: $pids)"
  # shellcheck disable=SC2086
  kill $pids 2>/dev/null || true
  sleep 0.5
  local remaining; remaining="$(lsof -ti tcp:"$port" -s TCP:LISTEN 2>/dev/null || true)"
  # shellcheck disable=SC2086
  [[ -n "$remaining" ]] && kill -9 $remaining 2>/dev/null || true
}

tmux_session() { echo "cs-$1"; }

tmux_exists() {
  command -v tmux >/dev/null 2>&1 && tmux has-session -t "$1" >/dev/null 2>&1
}

ensure_docker() {
  docker info >/dev/null 2>&1 && return

  if command -v colima >/dev/null 2>&1; then
    echo "  Starting Colima …"
    colima start
    docker context use colima >/dev/null 2>&1 || true
    return
  fi

  if [[ "$(uname -s)" == "Darwin" ]] && command -v open >/dev/null 2>&1; then
    echo "  Starting Docker Desktop …"
    open -gja Docker || true
    local elapsed=0
    until docker info >/dev/null 2>&1; do
      (( elapsed >= 120 )) && { echo "ERROR: Docker did not start in time." >&2; exit 1; }
      sleep 2; elapsed=$((elapsed + 2))
    done
    return
  fi

  echo "ERROR: Docker is not running. Start Docker Desktop or Colima and retry." >&2
  exit 1
}

# ─────────────────────────────────────────────────────────────────────────────
# Infrastructure
# ─────────────────────────────────────────────────────────────────────────────

start_infra() {
  ensure_docker
  echo ""
  echo "▶  Infrastructure"
  docker compose "${COMPOSE_FILES[@]}" up -d "${INFRA_SERVICES[@]}"
  wait_for_port  "PostgreSQL"     5432  90
  wait_for_port  "Neo4j Browser"  7474 120
  wait_for_port  "Neo4j Bolt"     7687 120
  wait_for_port  "MongoDB"        27017 120
  wait_for_port  "Kafka"          9092 120
  wait_for_http  "Schema Registry" "http://127.0.0.1:8081/subjects" 120
}

stop_infra() {
  echo ""
  echo "▶  Stopping infrastructure …"
  docker compose "${COMPOSE_FILES[@]}" stop "${INFRA_SERVICES[@]}"
}

# ─────────────────────────────────────────────────────────────────────────────
# Spring Boot services
# ─────────────────────────────────────────────────────────────────────────────

start_spring() {
  local name="$1" dir="$2" port="$3"
  local pid_file="$PID_DIR/$name.pid"
  local log_file="$LOG_DIR/$name.log"
  local jar="$ROOT_DIR/$dir/target/$dir-0.0.1-SNAPSHOT.jar"
  local sess; sess="$(tmux_session "$name")"

  tmux_exists "$sess"  && { echo "  $name  already running (tmux $sess)"; return; }
  pid_alive "$pid_file" && { echo "  $name  already running (pid $(cat "$pid_file"))"; return; }
  port_open "$port"    && { echo "  $name  port $port already in use"; return; }

  echo "  🔨 Building $name …"
  (cd "$ROOT_DIR/$dir" && ./mvnw -DskipTests -q package >"$LOG_DIR/$name-build.log" 2>&1) \
    || { echo "ERROR: build failed. See $LOG_DIR/$name-build.log" >&2; exit 1; }

  [[ -f "$jar" ]] || { echo "ERROR: jar not found: $jar" >&2; exit 1; }

  # Build a common set of explicit Spring args so property placeholders resolve
  # regardless of env-var case sensitivity on the host OS.
  local spring_args=(
    --spring.datasource.username="${dbuserId}"
    --spring.datasource.password="${dbuserpwd}"
    --jwt.secretKey="${secret}"
    --spring.neo4j.authentication.username="${neoUserId:-neo4j}"
    --spring.neo4j.authentication.password="${neoPwd}"
    --seed.default-password="${SEED_DEFAULT_PASSWORD:-}"
  )

  echo "  🚀 Starting  $name …"
  if command -v tmux >/dev/null 2>&1; then
    tmux new-session -d -s "$sess" -c "$ROOT_DIR/$dir" \
      "exec java -jar \"$jar\" ${spring_args[*]} >\"$log_file\" 2>&1"
    tmux display-message -p -t "$sess" "#{pane_pid}" >"$pid_file"
  else
    (cd "$ROOT_DIR/$dir"; nohup java -jar "$jar" "${spring_args[@]}" >"$log_file" 2>&1 & echo $! >"$pid_file")
  fi

  wait_for_port "$name" "$port" 180
}

stop_spring() {
  local name="$1" port="${2:-}"
  local pid_file="$PID_DIR/$name.pid"
  local sess; sess="$(tmux_session "$name")"

  if tmux_exists "$sess"; then
    echo "  Stopping $name (tmux $sess)"
    tmux kill-session -t "$sess" || true
  elif pid_alive "$pid_file"; then
    echo "  Stopping $name (pid $(cat "$pid_file"))"
    kill "$(cat "$pid_file")" || true
  elif [[ -n "$port" ]] && port_open "$port"; then
    kill_by_port "$port" "$name"
  fi
  rm -f "$pid_file"
}

start_spring_services() {
  echo ""
  echo "▶  Spring Boot services"
  mkdir -p "$PID_DIR" "$LOG_DIR"
  for i in "${!SPRING_NAMES[@]}"; do
    start_spring "${SPRING_NAMES[$i]}" "${SPRING_DIRS[$i]}" "${SPRING_PORTS[$i]}"
  done
}

stop_spring_services() {
  echo ""
  echo "▶  Stopping Spring Boot services …"
  for i in "${!SPRING_NAMES[@]}"; do
    stop_spring "${SPRING_NAMES[$i]}" "${SPRING_PORTS[$i]}"
  done
}

# ─────────────────────────────────────────────────────────────────────────────
# Node.js services
# ─────────────────────────────────────────────────────────────────────────────

start_node() {
  local name="$1" dir="$2" port="$3"
  local pid_file="$PID_DIR/$name.pid"
  local log_file="$LOG_DIR/$name.log"
  local svc_dir="$ROOT_DIR/$dir"

  pid_alive "$pid_file" && { echo "  $name  already running (pid $(cat "$pid_file"))"; return; }
  port_open "$port"    && { echo "  $name  port $port already in use"; return; }

  # Always write a fresh .env for Node.js services from root .env.local values
  cat >"$svc_dir/.env" <<NODEENV
PORT=8009
DATABASE_URL=postgresql://${dbuserId}:${dbuserpwd}@localhost:5432/collabsphere_spheres
JWT_SECRET=${secret}
ADMIN_EMAIL=${ADMIN_EMAIL:-admin@example.com}
EUREKA_HOST=localhost
EUREKA_PORT=8761
SERVICE_HOST=localhost
SERVICE_PORT=8009
NODEENV
  echo "  📝 Generated $dir/.env from root .env.local"

  install_node_deps "$svc_dir" "$name"

  # Run DB migration if available
  if [[ -f "$svc_dir/src/db/migrate.js" ]]; then
    echo "  🗄️  Running $name DB migration …"
    (cd "$svc_dir" && node src/db/migrate.js >>"$log_file" 2>&1) || \
      echo "  ⚠️  Migration failed (DB may not be ready yet — run manually: cd $dir && npm run db:migrate)"
  fi

  echo "  🚀 Starting  $name …"
  (cd "$svc_dir"; nohup npm start >"$log_file" 2>&1 & echo $! >"$pid_file")

  wait_for_port "$name" "$port" 60
}

stop_node() {
  local name="$1" port="${2:-}"
  local pid_file="$PID_DIR/$name.pid"

  if pid_alive "$pid_file"; then
    echo "  Stopping $name (pid $(cat "$pid_file"))"
    kill "$(cat "$pid_file")" || true
  elif [[ -n "$port" ]] && port_open "$port"; then
    kill_by_port "$port" "$name"
  fi
  rm -f "$pid_file"
}

start_node_services() {
  echo ""
  echo "▶  Node.js services"
  mkdir -p "$PID_DIR" "$LOG_DIR"
  for i in "${!NODE_NAMES[@]}"; do
    start_node "${NODE_NAMES[$i]}" "${NODE_DIRS[$i]}" "${NODE_PORTS[$i]}"
  done
}

stop_node_services() {
  echo ""
  echo "▶  Stopping Node.js services …"
  for i in "${!NODE_NAMES[@]}"; do
    stop_node "${NODE_NAMES[$i]}" "${NODE_PORTS[$i]}"
  done
}

# ─────────────────────────────────────────────────────────────────────────────
# Go services
# ─────────────────────────────────────────────────────────────────────────────

start_go() {
  local name="$1" dir="$2" port="$3"
  local pid_file="$PID_DIR/$name.pid"
  local log_file="$LOG_DIR/$name.log"
  local svc_dir="$ROOT_DIR/$dir"
  local binary="$svc_dir/$name"

  pid_alive "$pid_file" && { echo "  $name  already running (pid $(cat "$pid_file"))"; return; }
  port_open "$port"    && { echo "  $name  port $port already in use"; return; }

  # Write .env from root .env.local values
  cat >"$svc_dir/.env" <<GOENV
PORT=$port
MONGODB_URI=${MONGODB_URI:-mongodb://${mongoUserId:-mongouser}:${mongoUserPwd:-mongopass}@localhost:27017/collabsphere_messages?authSource=admin}
JWT_SECRET=${secret}
EUREKA_HOST=localhost
EUREKA_PORT=8761
SERVICE_HOST=localhost
ADMIN_EMAIL=${ADMIN_EMAIL:-admin@example.com}
GOENV

  # Find go binary
  local GO_BIN
  GO_BIN="$(command -v go 2>/dev/null || echo /opt/homebrew/bin/go)"

  # Build
  echo "  🔨 Building $name …"
  (cd "$svc_dir" && "$GO_BIN" build -o "$binary" . >>"$log_file" 2>&1) \
    || { echo "ERROR: Go build failed. See $log_file" >&2; exit 1; }

  echo "  🚀 Starting  $name …"
  (cd "$svc_dir"; nohup "$binary" >>"$log_file" 2>&1 & echo $! >"$pid_file")
  wait_for_port "$name" "$port" 30
}

stop_go() {
  local name="$1" port="${2:-}"
  local pid_file="$PID_DIR/$name.pid"

  if pid_alive "$pid_file"; then
    echo "  Stopping $name (pid $(cat "$pid_file"))"
    kill "$(cat "$pid_file")" || true
  elif [[ -n "$port" ]] && port_open "$port"; then
    kill_by_port "$port" "$name"
  fi
  rm -f "$pid_file"
}

start_go_services() {
  echo ""
  echo "▶  Go services"
  mkdir -p "$PID_DIR" "$LOG_DIR"
  for i in "${!GO_NAMES[@]}"; do
    start_go "${GO_NAMES[$i]}" "${GO_DIRS[$i]}" "${GO_PORTS[$i]}"
  done
}

stop_go_services() {
  echo ""
  echo "▶  Stopping Go services …"
  for i in "${!GO_NAMES[@]}"; do
    stop_go "${GO_NAMES[$i]}" "${GO_PORTS[$i]}"
  done
}

# ─────────────────────────────────────────────────────────────────────────────
# Python services
# ─────────────────────────────────────────────────────────────────────────────

start_python() {
  local name="$1" dir="$2" port="$3"
  local pid_file="$PID_DIR/$name.pid"
  local log_file="$LOG_DIR/$name.log"
  local svc_dir="$ROOT_DIR/$dir"

  pid_alive "$pid_file" && { echo "  $name  already running (pid $(cat "$pid_file"))"; return; }
  port_open "$port"    && { echo "  $name  port $port already in use"; return; }

  # Write .env from root .env.local values
  cat >"$svc_dir/.env" <<PYENV
PORT=$port
DATABASE_URL=postgresql://${dbuserId}:${dbuserpwd}@localhost:5432/postgres
JWT_SECRET=${secret}
KAFKA_BOOTSTRAP_SERVERS=localhost:9092
SCHEMA_REGISTRY_URL=http://localhost:8081
EUREKA_HOST=localhost
EUREKA_PORT=8761
SERVICE_HOST=localhost
ADMIN_EMAIL=${ADMIN_EMAIL:-admin@example.com}
PYENV

  # Ensure virtualenv exists and deps are installed
  if [[ ! -d "$svc_dir/.venv" ]]; then
    echo "  📦 Creating Python venv for $name …"
    python3 -m venv "$svc_dir/.venv"
    "$svc_dir/.venv/bin/pip" install -q -r "$svc_dir/requirements.txt"
  fi

  echo "  🚀 Starting  $name …"
  (cd "$svc_dir"; nohup .venv/bin/python main.py >>"$log_file" 2>&1 & echo $! >"$pid_file")
  wait_for_port "$name" "$port" 30
}

stop_python() {
  local name="$1" port="${2:-}"
  local pid_file="$PID_DIR/$name.pid"

  if pid_alive "$pid_file"; then
    echo "  Stopping $name (pid $(cat "$pid_file"))"
    kill "$(cat "$pid_file")" || true
  elif [[ -n "$port" ]] && port_open "$port"; then
    kill_by_port "$port" "$name"
  fi
  rm -f "$pid_file"
}

start_python_services() {
  echo ""
  echo "▶  Python services"
  mkdir -p "$PID_DIR" "$LOG_DIR"
  for i in "${!PY_NAMES[@]}"; do
    start_python "${PY_NAMES[$i]}" "${PY_DIRS[$i]}" "${PY_PORTS[$i]}"
  done
}

stop_python_services() {
  echo ""
  echo "▶  Stopping Python services …"
  for i in "${!PY_NAMES[@]}"; do
    stop_python "${PY_NAMES[$i]}" "${PY_PORTS[$i]}"
  done
}

# ─────────────────────────────────────────────────────────────────────────────
# Seed data
# ─────────────────────────────────────────────────────────────────────────────

seed_data() {
  echo ""
  echo "▶  Seeding demo data"

  local spheres_dir="$ROOT_DIR/spheres-service"
  local log="$LOG_DIR/seed.log"
  mkdir -p "$LOG_DIR"

  # 1. Spheres seed (resolves user IDs dynamically from users DB)
  if [[ -f "$spheres_dir/src/db/seed.js" ]]; then
    echo "  🌱 Running spheres-service seed …"
    install_node_deps "$spheres_dir" "spheres-service"
    (cd "$spheres_dir" && node src/db/seed.js >>"$log" 2>&1) \
      && echo "  ✓  Spheres seeded" \
      || echo "  ⚠️  Sphere seed failed — check $log"
  fi

  # 2. Seed all users as Neo4j Person nodes from PostgreSQL (dynamic — no hardcoded IDs)
  local neo_pass="${neoPwd:-}"
  echo "  🔗 Syncing all users to Neo4j …"
  docker exec collabsphere-postgres psql -U postgres -d postgres -tAc \
    "SELECT id, name, email, works_at FROM users ORDER BY id;" 2>/dev/null | \
  while IFS='|' read -r uid uname uemail uworks; do
    uid=$(echo "$uid" | tr -d ' \n')
    uname=$(echo "$uname" | tr -d '\n' | sed "s/'/''/g")
    uemail=$(echo "$uemail" | tr -d ' \n')
    uworks=$(echo "$uworks" | tr -d '\n' | sed "s/'/''/g")
    [[ -z "$uid" ]] && continue
    docker exec collabsphere-neo4j cypher-shell -u "${neoUserId:-neo4j}" -p "$neo_pass" \
      "MERGE (p:Person {userId: ${uid}}) SET p.name='${uname}', p.email='${uemail}', p.worksAt='${uworks}', p.updatedAt=localdatetime()" \
      >/dev/null 2>&1
  done
  echo "  ✓  All users synced to Neo4j"

  # 3. Connect admin to all other users in Neo4j
  docker exec collabsphere-neo4j cypher-shell -u "${neoUserId:-neo4j}" -p "$neo_pass" "
    MATCH (admin:Person {email: '${ADMIN_EMAIL:-admin@example.com}'})
    MATCH (u:Person) WHERE u.email <> '${ADMIN_EMAIL:-admin@example.com}'
    MERGE (admin)-[:CONNECTED_TO]->(u)
    MERGE (u)-[:CONNECTED_TO]->(admin)
  " >/dev/null 2>&1 && echo "  ✓  Admin connected to all seeded users" || true

  echo ""
  echo "  Login: ${ADMIN_EMAIL:-admin@example.com}  (password configured in .env.local)"
}

# ─────────────────────────────────────────────────────────────────────────────
# React UI
# ─────────────────────────────────────────────────────────────────────────────

ui_pids() { lsof -ti "tcp:$UI_PORT" 2>/dev/null || true; }

start_ui() {
  local pids; pids="$(ui_pids)"
  if [[ -n "$pids" ]]; then
    echo "  collabsphere-ui  already running on port $UI_PORT (pids: $pids)"
    return
  fi

  echo ""
  echo "▶  React UI"
  mkdir -p "$LOG_DIR"
  install_node_deps "$UI_DIR" "collabsphere-ui"
  (cd "$UI_DIR"; nohup npm run dev -- --host 127.0.0.1 --port "$UI_PORT" >"$LOG_DIR/ui.log" 2>&1 &)

  local elapsed=0
  printf "  ⏳ Waiting for %-28s" "collabsphere-ui …"
  until [[ -n "$(ui_pids)" ]]; do
    (( elapsed >= 30 )) && { echo " TIMEOUT"; echo "Check $LOG_DIR/ui.log" >&2; exit 1; }
    printf "."; sleep 1; elapsed=$((elapsed + 1))
  done
  echo " ✓  http://localhost:$UI_PORT"
}

stop_ui() {
  local pids; pids="$(ui_pids)"
  if [[ -z "$pids" ]]; then
    echo "  collabsphere-ui  not running on port $UI_PORT"
    return
  fi
  echo "  Stopping collabsphere-ui (pids: $pids)"
  # shellcheck disable=SC2086
  kill $pids 2>/dev/null || true
  sleep 1
  local remaining; remaining="$(ui_pids)"
  [[ -n "$remaining" ]] && kill -9 $remaining 2>/dev/null || true
}

# ─────────────────────────────────────────────────────────────────────────────
# Status
# ─────────────────────────────────────────────────────────────────────────────

status() {
  echo ""
  echo "╔════════════════════════════════════════════════════════╗"
  echo "║              CollabSphere — Service Status             ║"
  echo "╚════════════════════════════════════════════════════════╝"
  echo ""

  echo "  Infrastructure:"
  for svc in "${INFRA_SERVICES[@]}"; do
    local state; state="$(docker compose "${COMPOSE_FILES[@]}" ps --format '{{.Status}}' "$svc" 2>/dev/null || echo stopped)"
    printf "    %-20s %s\n" "$svc" "${state:-stopped}"
  done

  echo ""
  echo "  Spring Boot:"
  for i in "${!SPRING_NAMES[@]}"; do
    local name="${SPRING_NAMES[$i]}" port="${SPRING_PORTS[$i]}"
    local pid_file="$PID_DIR/$name.pid"
    local sess; sess="$(tmux_session "$name")"
    if tmux_exists "$sess"; then
      printf "    %-28s 🟢 tmux:%s  :%-6s\n" "$name" "$sess" "$port"
    elif pid_alive "$pid_file"; then
      printf "    %-28s 🟢 pid:%-6s :%-6s\n" "$name" "$(cat "$pid_file")" "$port"
    elif port_open "$port"; then
      printf "    %-28s 🟡 running (external)  :%-6s\n" "$name" "$port"
    else
      printf "    %-28s 🔴 stopped\n" "$name"
    fi
  done

  echo ""
  echo "  Go:"
  for i in "${!GO_NAMES[@]}"; do
    local name="${GO_NAMES[$i]}" port="${GO_PORTS[$i]}"
    local pid_file="$PID_DIR/$name.pid"
    if pid_alive "$pid_file"; then
      printf "    %-28s 🟢 pid:%-6s :%-6s\n" "$name" "$(cat "$pid_file")" "$port"
    elif port_open "$port"; then
      printf "    %-28s 🟡 running (external)  :%-6s\n" "$name" "$port"
    else
      printf "    %-28s 🔴 stopped\n" "$name"
    fi
  done

  echo ""
  echo "  Python:"
  for i in "${!PY_NAMES[@]}"; do
    local name="${PY_NAMES[$i]}" port="${PY_PORTS[$i]}"
    local pid_file="$PID_DIR/$name.pid"
    if pid_alive "$pid_file"; then
      printf "    %-28s 🟢 pid:%-6s :%-6s\n" "$name" "$(cat "$pid_file")" "$port"
    elif port_open "$port"; then
      printf "    %-28s 🟡 running (external)  :%-6s\n" "$name" "$port"
    else
      printf "    %-28s 🔴 stopped\n" "$name"
    fi
  done

  echo ""
  echo "  Node.js:"
  for i in "${!NODE_NAMES[@]}"; do
    local name="${NODE_NAMES[$i]}" port="${NODE_PORTS[$i]}"
    local pid_file="$PID_DIR/$name.pid"
    if pid_alive "$pid_file"; then
      printf "    %-28s 🟢 pid:%-6s :%-6s\n" "$name" "$(cat "$pid_file")" "$port"
    elif port_open "$port"; then
      printf "    %-28s 🟡 running (external)  :%-6s\n" "$name" "$port"
    else
      printf "    %-28s 🔴 stopped\n" "$name"
    fi
  done

  echo ""
  echo "  React UI:"
  local ui_pid_list; ui_pid_list="$(ui_pids)"
  if [[ -n "$ui_pid_list" ]]; then
    printf "    %-28s 🟢 pid:%-6s http://localhost:%s\n" "collabsphere-ui" "$(echo "$ui_pid_list" | head -1)" "$UI_PORT"
  else
    printf "    %-28s 🔴 stopped\n" "collabsphere-ui"
  fi

  echo ""
  echo "  Key URLs:"
  echo "    UI          →  http://localhost:$UI_PORT"
  echo "    API Gateway →  http://localhost:8007"
  echo "    Eureka      →  http://localhost:8761"
  echo "    Neo4j       →  http://localhost:7474"
  echo ""
}

# ─────────────────────────────────────────────────────────────────────────────
# Logs
# ─────────────────────────────────────────────────────────────────────────────

show_logs() {
  local name="${1:-}"
  if [[ -z "$name" ]]; then
    echo "Usage: $0 logs <service>" >&2
    echo "Services: ${SPRING_NAMES[*]} ${GO_NAMES[*]} ${PY_NAMES[*]} ${NODE_NAMES[*]} ui" >&2
    exit 1
  fi

  local log_file
  if [[ "$name" == "ui" ]]; then
    log_file="$LOG_DIR/ui.log"
  else
    log_file="$LOG_DIR/$name.log"
  fi

  if [[ ! -f "$log_file" ]]; then
    echo "No log file found: $log_file" >&2
    exit 1
  fi

  echo "Tailing $log_file  (Ctrl-C to stop)"
  tail -f "$log_file"
}

# ─────────────────────────────────────────────────────────────────────────────
# Usage
# ─────────────────────────────────────────────────────────────────────────────

usage() {
  cat <<EOF

CollabSphere local dev script

Usage:
  $0 start              Start infra + all services + UI
  $0 start --no-ui      Start infra + all services (skip UI)
  $0 stop               Stop all services (keep infra running)
  $0 stop --infra       Stop all services + infra containers
  $0 restart            Stop then start everything
  $0 seed               Seed demo data (spheres, admin user connections)
  $0 status             Show status of every service
  $0 logs <service>     Tail one service log  (use 'ui' for the React app)
  $0 ui start|stop      Manage only the React UI

Services: ${SPRING_NAMES[*]} ${GO_NAMES[*]} ${PY_NAMES[*]} ${NODE_NAMES[*]} ui

First-time setup:
  cp .env.local.example .env.local   # fill in credentials
  $0 start                           # starts everything
  $0 seed                            # loads demo data

EOF
}

# ─────────────────────────────────────────────────────────────────────────────
# Entrypoint
# ─────────────────────────────────────────────────────────────────────────────

main() {
  local cmd="${1:-start}"
  case "$cmd" in
    start)
      load_env
      start_infra
      start_spring_services
      start_go_services
      start_python_services
      start_node_services
      [[ "${2:-}" != "--no-ui" ]] && start_ui
      status
      ;;
    stop)
      load_env
      stop_ui
      stop_spring_services
      stop_go_services
      stop_python_services
      stop_node_services
      [[ "${2:-}" == "--infra" ]] && stop_infra
      ;;
    restart)
      load_env
      stop_ui
      stop_spring_services
      stop_go_services
      stop_python_services
      stop_node_services
      start_infra
      start_spring_services
      start_go_services
      start_python_services
      start_node_services
      start_ui
      status
      ;;
    status)
      load_env
      status
      ;;
    seed)
      load_env
      seed_data
      ;;
    logs)
      show_logs "${2:-}"
      ;;
    ui)
      load_env
      case "${2:-start}" in
        start) start_ui ;;
        stop)  stop_ui  ;;
        *) echo "Usage: $0 ui [start|stop]" >&2; exit 1 ;;
      esac
      ;;
    help|--help|-h)
      usage
      ;;
    *)
      usage
      exit 1
      ;;
  esac
}

main "$@"

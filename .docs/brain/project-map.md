# Project Map — repository structure

```
CollabSphereApp/
├── api-gateway/            Java · Spring Cloud Gateway · :8007 · routing, JWT auth filter, CORS
├── user-service/           Java · Spring Boot · :9020 · PostgreSQL · auth/profiles/stats · Kafka producer
├── posts-service/          Java · Spring Boot · :9010 · PostgreSQL · feed/posts/comments/likes · Kafka producer · HTTP→connections
├── connections-service/    Java · Spring Data Neo4j · :9030 · Neo4j · social graph · Kafka consumer+producer
├── spheres-service/        Node.js · Express · :8009 · PostgreSQL (pg) · communities/threads/votes · src/db migrate+seed
├── messages-service/       Go · Gin · :8010 · MongoDB · direct messages
├── notification-service/   Python · FastAPI · :9070 · PostgreSQL · activity feed · Kafka consumer (aiokafka)
├── collabsphere-ui/        React + Vite · the single user-facing app
│   ├── index.html  vite.config.js  package.json
│   ├── public/icon.svg icon.png
│   └── src/  (api/ auth/ components/ pages/ utils/ styles/app.css)  — see .docs/brain/frontend-map.md
├── scripts/
│   ├── db-init/01-create-databases.sh   creates collabsphere_users/_posts/_notifications/_spheres
│   └── seed-neo4j.sh                     seeds the connections graph
├── .docs/                   ← ALL documentation lives here (this knowledge base)
│   ├── frontend.md  backend.md  journal.md
│   ├── brain/             AI navigation + maps + decisions
│   ├── guardrails/        application / frontend / backend rules
│   ├── architecture/      flows, HLD, LLD, .drawio diagrams
│   ├── tbd/               devops/ (platform) + application/ (UI-first features) + README index
│   ├── design/            DESIGN.md, REDESIGN.md, architecture.drawio (existing)
│   ├── product/PRODUCT.md guides/(START,STOP,PREREQUISITES,CMDS,...) journal/Project-Journal.md
├── README.md
└── .env.local(.example)   shared secrets template (gitignored)
```

## Shared infrastructure (run locally, not in-repo)

| Component | Port | Used by |
|---|---|---|
| PostgreSQL | 5432 | user, posts, spheres, notification |
| Neo4j (bolt) | 7687 | connections |
| MongoDB | 27017 | messages |
| Kafka | 9092 | user/posts/connections (produce) · connections/notification (consume) |
| Schema Registry | 8081 | Avro serialization for Kafka |

## Build tooling per language

- Java: Maven wrapper (`./mvnw`), `target/` build output (gitignored generally).
- Node: `npm`, `node_modules/`.
- Go: `go.mod`/`go.sum`, compiled binaries (`messages-service`, `*-go`).
- Python: `requirements.txt`, `.venv/`.

See `.docs/brain/important-files.md` for the highest-leverage files, and `.docs/brain/service-map.md` / `frontend-map.md` / `backend-map.md` for detail.

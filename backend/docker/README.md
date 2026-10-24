# Optional Local Docker Setup

> **Architectural Policy Notice (ADR-003):**  
> Docker is strictly optional. It is **not** required for everyday frontend or backend development, test execution, or CI checks. Do **not** self-host production PostgreSQL in Docker at this stage.

---

## 1. When to Use Docker

Use this Docker configuration if you need an isolated local PostgreSQL 16 database to rehearse SQL migrations or execute integration tests without connecting to Supabase cloud.

## 2. Usage Instructions

### Start Local PostgreSQL
```bash
docker compose -f backend/docker/docker-compose.yml up -d
```

### Check Database Health
```bash
docker compose -f backend/docker/docker-compose.yml ps
```

### Connect Locally
* **Host:** `localhost`
* **Port:** `5432`
* **Database:** `gulistan_dev`
* **Username:** `postgres`
* **Password:** `postgrespassword`
* **Connection String:** `postgresql://postgres:postgrespassword@localhost:5432/gulistan_dev`

### Stop and Clean Up
```bash
# Stop container:
docker compose -f backend/docker/docker-compose.yml down

# Stop and wipe volume:
docker compose -f backend/docker/docker-compose.yml down -v
```

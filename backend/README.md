# Gulistan Marriage Bureau — Backend Workspace

This workspace houses the backend implementation, database migrations, security policies, verification scripts, automated tests, and configuration templates for the Gulistan Marriage Bureau platform.

The existing frontend application resides in `frontend/` and remains preserved. Start with the [Documentation Bible](docs/README.md).

---

## 1. Quick Start & Setup Commands

All commands are reproducible from a clean checkout without requiring external cloud accounts or Docker.

### Prerequisites
* **Node.js:** v18.0.0 or higher (v20+ recommended; v24 supported)
* **npm:** v9.0.0 or higher

### Environment Configuration
1. Copy the example configuration template:
   ```bash
   cp backend/.env.example backend/.env
   ```
2. Inspect `backend/.env`. In development, defaults and placeholder variables allow offline validation.
3. **Security Policy:** Never commit `.env` or paste secrets into code. `.env` is ignored by Git.

### Run Automated Backend Tests
Run the native Node.js test suite:
```bash
npm --prefix backend test
```
Or from within the `backend/` directory:
```bash
cd backend
npm test
```

### Validate Database Migrations
Validate SQL migration file naming, sequence continuity, and transaction safety:
```bash
npm --prefix backend run migrate:validate
```

### Inspect Migration Status
View all registered migrations and their sequence:
```bash
npm --prefix backend run migrate:status
```

---

## 2. Directory Structure

```text
backend/
├── .env.example               # Safe environment template with non-sensitive placeholders
├── AGENT_TASK_QUEUE.md        # Persistent AI agent task execution queue
├── README.md                  # This document
├── package.json               # Backend npm package manifest and script runners
├── docker/
│   ├── README.md              # Optional Docker instructions
│   └── docker-compose.yml     # Optional local PostgreSQL 16 container for testing
├── docs/                      # Engineering Documentation Bible (01 to 11)
│   ├── README.md              # Documentation index and reading order
│   ├── 01-system-architecture.md
│   ├── ...
│   ├── 09-open-decisions.md   # Architectural Decision Records (ADRs) & closed decisions
│   ├── 10-frontend-domain-inventory.md
│   └── 11-owner-decision-sheet.md
├── migrations/                # Authoritative SQL schema migrations
│   └── README.md              # Migration guidelines, naming conventions & safety rules
├── scripts/                   # Local verification utilities
│   ├── migration-status.js    # Inspects migration directory sequence
│   └── validate-migrations.js # Verifies sequential numbers, filenames, and safety rules
└── tests/                     # Automated backend verification tests
    └── tooling.test.js        # Validates environment security, manifest & migration scripts
```

---

## 3. Approved Architecture Baselines (DECIDED)

The following architectural choices were approved via owner directive on 2026-10-24:
* **ADR-002 & OPEN-013 (Provider & Budget):** Supabase PostgreSQL, Auth, private Storage, and Edge Functions. Free tier during development ($0/mo); upgrade to Pro ($25/mo) at launch for point-in-time recovery and candidate photo storage.
* **OPEN-001 (Authentication):** Hybrid Model (Option D). High-entropy Email + Password for staff (Nadeem, Admin); secure Magic Links or WhatsApp verified links for candidate/family views.
* **OPEN-002 (Staff Scope):** Single Lead Matchmaker (Option A). Mr. Nadeem Ahmed has full operational oversight; Administrator role provides system governance.
* **OPEN-003 (Intake Model):** Closed Concierge Intake (Option A). Staff enters verified candidates from walk-in, phone, or WhatsApp interviews.
* **OPEN-004 (Consent Proof):** Representative Legal Certification Checkbox (Option A). Registration form captures submitter relation with explicit confirmation of candidate consent.
* **OPEN-014 (Data Region):** Middle East (`me-central-1`) or Singapore (`ap-southeast-1`) (Option A). Low latency (40–70 ms) to Pakistan with SOC 2 compliance.

---

## 4. Optional Docker Workflow

Docker is **strictly optional** (per ADR-003). It is not required for everyday development or automated tests.

If you wish to test migrations against an isolated local PostgreSQL 16 instance:
```bash
# Start local PostgreSQL:
docker compose -f backend/docker/docker-compose.yml up -d

# Stop local PostgreSQL:
docker compose -f backend/docker/docker-compose.yml down
```
See [`backend/docker/README.md`](docker/README.md) for full connection parameters.

---

## 5. Security & Secret Protection Rules

1. **Zero Real Secrets in Git:** All committed `.env.example` files contain descriptive names and non-secret placeholders only.
2. **Server-Only Variables:** `SUPABASE_SERVICE_ROLE_KEY` and direct database connection strings must NEVER be prefixed with `VITE_` or exposed to browser clients.
3. **Private Buckets:** Candidate photographs must reside in private buckets accessed solely through short-lived, signed URLs issued by trusted backend logic.

# Database Migrations — Gulistan Marriage Bureau

This directory is the authoritative source of truth for database schema definitions, access control policies, foreign key relationships, and indexes.

---

## 1. File Naming Convention

Migrations must follow a strict 5-digit sequential prefix followed by a concise snake_case description:

```text
backend/migrations/
├── 00001_initial_schema_baseline.sql
├── 00002_add_candidate_siblings.sql
└── ...
```

* **Sequential Numbering:** Migration numbers must strictly increment without gaps (`00001`, `00002`, `00003`, etc.).
* **Zero Padding:** Numbers must be 5 digits with leading zeros.
* **Extension:** Must end in `.sql`.

---

## 2. Mandatory Migration Safety Invariants

Before any migration is committed to `main`:

1. **Transaction Safety:** Wrap all DDL statements in a transaction block unless specifically forbidden by PostgreSQL (e.g., `CREATE INDEX CONCURRENTLY`):
   ```sql
   BEGIN;
   -- Schema definitions and policy statements
   COMMIT;
   ```
2. **Row-Level Security (RLS) Baseline:** Every newly created public table must immediately enable RLS:
   ```sql
   ALTER TABLE public.table_name ENABLE ROW LEVEL SECURITY;
   ```
3. **Least Privilege Grants:** Explicitly grant only required permissions to `anon`, `authenticated`, or `service_role`. Never grant unrestricted write access to `anon` or `public`.
4. **No Destructive Operations Without Safeguards:**
   * Raw `DROP DATABASE` is strictly forbidden.
   * `DROP TABLE` or `DROP COLUMN` must include `IF EXISTS` and requires explicit documented data migration procedures.
5. **No Production Data Seeding in Schema Migrations:**
   * Schema migrations must contain structure, constraints, indexes, triggers, and RLS policies only.
   * Mock test data must not be seeded into authoritative migrations.

---

## 3. Migration Tooling

Validate your migrations locally using the backend scripts:

```bash
# Validate naming, sequence, and SQL safety checks across all migration files:
npm run migrate:validate

# List migration files and their sequential order:
npm run migrate:status
```

*Note: Initial schema implementation begins under Task `T-004`.*

# 2. Backend Data Model

## 2.1 Design rules

This is a logical schema specification, not a migration file. Implement it through reviewed SQL migrations only after open decisions that affect access and retention are settled. Use UUID primary keys for database records; a human-readable reference such as `GLS-000123` may be a separate unique public/business reference. Never use a sequential ID as a secret.

Store timestamps as `timestamptz` in UTC. Store money as integer minor units or PostgreSQL `numeric`, never floating point. The project is Pakistan-focused; default financial currency is PKR, but currency and reporting period must be explicit where relevant. Use foreign keys, check constraints, unique constraints and indexes based on query patterns.

Do not force fake values for unknown or withheld information. For sensitive optional fields, distinguish known value, unknown, not applicable and not disclosed where the workflow requires it.

## 2.2 Proposed entities

### Identity and access
- `user_profiles`: one row per authenticated user, keyed to `auth.users.id`; safe display name, preferred language, account status and timestamps.
- `user_roles` or equivalent trusted role assignment: role values managed only by authorized server/admin workflows. A user cannot promote themselves.
- Role names at product level: `admin`, `matchmaker` (Nadeem/authorized staff), `customer`. Public visitor is unauthenticated and is not an authenticated role.
- Avoid putting authoritative role assignments in user-editable metadata.

### Profiles
- `profiles`: stable profile reference, status, source type, created/updated timestamps, created/updated by, verification state, preferred language, and non-secret operational metadata.
- `profile_private_details`: contact person, phone, email, full legal/display name if access differs, and other fields requiring tighter access. Split further if policy requires.
- `profile_preferences`: spouse criteria, with structured values and per-criterion importance.
- `profile_siblings`: one row per sibling; relationship, optional name/age/occupation/marital status/marriage details/children count only when necessary and authorized.
- `profile_property_details`: ownership, type, area/unit, approximate value, city/locality and living arrangement. Avoid unnecessary precise addresses.
- `profile_photos`: profile ID, private bucket/path, upload metadata, review status, consent linkage, uploader, timestamps, active/replaced state. Do not store publicly accessible URLs as the source of truth.
- `profile_consents`: subject/profile, consent purpose, granted/withdrawn status, timestamp, actor, version of notice, method/source and relevant scope. Photo storage and photo disclosure consent must be distinguishable.
- `profile_sources` or source fields: direct web, walk-in, phone referral, external matchmaker; link external sources to the correct matchmaker.
- `profile_status_history`: old/new status, actor, timestamp, reason code; avoid dumping sensitive details.

### Matching and introductions
- `match_cases`: a candidate pair / request context, both profile IDs, status, created-by, timestamps, and duplicate-pair prevention.
- `match_evaluations`: versioned scoring result, eligibility, score, criterion-by-criterion explanation, missing/unverified indicators and algorithm version.
- `match_decisions`: human review decision, actor, time and reason; do not overwrite history when a decision changes.
- `introductions` (or `share_grants`): intended recipients/party scope, selected disclosure fields, approved snapshot, status, expiry/revocation, creator and approval references.
- `share_grants` should store a hash of a high-entropy bearer token, not the raw token. Never put personal data in the token or URL.

### External matchmakers and finance
- `external_matchmakers`: identity, business contact, city, status, approved business terms and timestamps; restricted to authorized staff.
- `financial_transactions`: append-only business entries for payable, receivable, payment, receipt, commission or adjustment; amount, currency, effective date, party, optional profile/match case, description/code, creator and timestamps.
- Corrections should be represented by a reversal/adjustment referencing the original entry rather than silently rewriting financial history. Exact accounting rules remain an open business decision.
- Ledger balance should be derived from entries using an explicitly documented sign convention; never trust a client-provided balance.

### Operations
- `follow_ups`: profile/match context, due date, type, priority, status, assigned user, minimal notes and completion timestamps.
- `audit_events`: actor, action code, target type/ID, timestamp, request/correlation ID, outcome and safe metadata. Do not log full profiles, photos, credentials, tokens, phone numbers or disclosure contents.
- Optional `duplicate_review_candidates`: possible duplicate pair, reason and resolution status; matching candidates is a human-review aid, not automatic merging.

## 2.3 Profile field mapping from the current UI

The existing `ProfileRecord` shape includes:
- Identity: fullName, displayName, gender, age, optional dob, height, maritalStatus.
- Personal attributes: religion, aqeedah, caste/subCaste.
- Education/work: education, educationField, occupation, jobTitle, companyOrSector, monthlyIncomePKR.
- Location: hometown, currentCity, residenceArea.
- Family: father/mother status and occupation, siblings, familyBackgroundNotes.
- Property: ownership/type/area/value/city/locality/householdArrangement.
- Preferences: age bounds, height, marital status, religion/aqeedah/caste, education, occupations, cities, property/family arrangement, lifestyle, relocation, work-after-marriage, criteria classifications.
- Operational: status, source, assignedMatchmakerId, contact person/phone/email, preferred contact method, createdAt/updatedAt, internalNotes.
- Current UI has a single `photoUrl` and boolean `photoPermissionGranted`; production storage and consent must be normalized into separate records.

Do not blindly copy every field into one table. In particular, contact information, internal notes, photographs, sensitive family details, and fields intended for sharing need different access boundaries. Some current UI fields may be changed through a reviewed schema mapping; document the mapping and preserve data semantics.

## 2.4 Enums and controlled values

Use PostgreSQL enums or checked lookup tables where the vocabulary is stable. Candidate vocabularies from the frontend include:
- Profile status: `pending_review`, `approved`, `active`, `introduction_authorized`, `inactive`, `restricted`.
- Source: `direct_web`, `walk_in`, `external_matchmaker`, `phone_referral`.
- Marital status: `never_married`, `divorced`, `widowed`, `khula`.
- Preference importance: `mandatory`, `preferred`, `acceptable_range`, `unknown`, `not_disclosed`.
- Match status from UI: `suggested`, `approved_by_nadeem`, `shared_with_parties`, `accepted_by_customer`, `rejected`, `deferred`.

These are existing UI values, not final approved taxonomies. Confirm state transitions and terminology before freezing migrations. Do not invent new states ad hoc in code.

## 2.5 Data integrity and indexing

Required integrity:
- Unique internal profile reference.
- Foreign keys for all profile, user, matchmaker, photo, match and financial relationships.
- Check age/range/amount constraints where appropriate.
- Prevent a match pair from being duplicated in the same direction; decide whether pair order should be normalized.
- Prevent invalid transitions through trusted functions and/or constraints.
- Use idempotency keys for operations that may be retried.
- Keep immutable decision/financial/audit history.

Likely indexes to validate with query plans:
- Profile status and created_at.
- Searchable structured fields used together in common filters.
- Current city/location, age, marital status and source.
- Foreign keys for siblings, preferences, photos, matches, follow-ups and ledger.
- Match pair + status + created_at.
- Financial party + effective date.
- Share token hash and expiry/status.
- Audit target + timestamp.

Do not add every possible index without measuring write/storage cost. Test representative queries against at least 100,000 synthetic profiles.

## 2.6 Seed data and migrations

- Migrations are the source of truth. Never require manual dashboard edits for reproducible schema setup.
- Use synthetic, clearly labelled seed data only in development/test.
- Never copy production profile data into development.
- A migration must include safe constraints, relevant RLS/grants, indexes and a test or verification note.
- Destructive migrations require an explicit migration/recovery plan and owner approval.

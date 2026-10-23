# 3. Authorization, Privacy and Threat Model

## 3.1 Security posture

Profiles contain highly sensitive personal and family information. Default to deny. Collect the minimum data needed, and disclose the minimum data needed for a specific introduction.

The browser is untrusted. Never use hidden UI controls, React state, route names, a role prop, or a client-supplied user ID as proof of permission. Every protected operation must be authorized by the backend and database.

## 3.2 Role model

Product roles:
- **Public / unauthenticated:** may access only approved public marketing content and the explicitly approved registration entry point.
- **Customer:** may read/update their own permitted fields and preferences; may see only their own consent and specifically authorized introductions. They cannot browse the private registry or financial records.
- **Matchmaker:** may perform assigned bureau workflows under granted permissions: profile review/edit, search, match review, controlled sharing, follow-ups, and finance only if explicitly granted.
- **Admin:** account/role governance, configuration, security review and authorized operational reporting. Admin access is still audited and should be least-privilege.

Whether one person may simultaneously hold multiple roles, and whether staff access is global or assigned, are open decisions. Implement roles in trusted records, not user-editable metadata. Never trust a role value from a request body.

## 3.3 Authorization matrix (minimum baseline)

| Resource/action | Public | Customer | Matchmaker | Admin |
|---|---|---|---|---|
| Marketing pages | Read | Read | Read | Read |
| Submit new profile | Limited intake only | Own submission | Create on behalf of authorized subject | Authorized support |
| Read private profile registry | Deny | Own permitted fields only | Allowed scope only | Explicit administrative scope |
| Edit profile | Deny | Own allowed fields only | Allowed scope | Allowed scope |
| Approve/reject registration | Deny | Deny | If granted | If granted |
| Read phone/contact data | Deny | Own permitted contact | Need-to-know | Need-to-know, audited |
| Read/upload private photos | Deny | Own photos subject to policy | Authorized profile + consent | Need-to-know, audited |
| Change consent | Own consent only | Own consent only | Record subject authorization; cannot fabricate consent | Administrative assistance cannot substitute for subject consent |
| Search/matching | Deny private search | Only explicitly approved results | Authorized profiles | Authorized scope |
| Approve match | Deny | No | Human matchmaker | If explicitly allowed |
| Create/revoke share | Deny | Only if a separate approved customer workflow is defined | Authorized matchmaker | If explicitly allowed |
| Read finance/ledger | Deny | Deny | Finance permission required | Finance permission required |
| Manage roles | Deny | Deny | Deny | Restricted admin workflow |
| Read audit events | Deny | Own user-facing history only if designed | Limited relevant events | Authorized audit access |
| Export bulk data | Deny | Own export only if approved | Explicit permission, logged | Explicit permission, logged |

This is a minimum-deny baseline. Exact policy scope must be implemented in RLS and trusted functions and tested with real user JWTs.

## 3.4 Supabase implementation rules

- Enable RLS on every table exposed to the browser through Supabase APIs.
- Define explicit grants and RLS policies per table and operation; do not assume enabling RLS removes existing grants.
- Use `auth.uid()` and trusted role/ownership relationships for policy predicates.
- Do not allow a customer to write profile status, verified flags, role assignments, source attribution, approval history, financial data or audit records directly.
- Prefer a narrow server-side function for privileged transitions.
- Service-role keys bypass normal RLS protections and must never reach the browser.
- Storage policies must bind object paths to profile ownership/authorized roles and consent state; a private bucket alone is not enough.
- Test denial as carefully as successful access.

## 3.5 Consent and privacy

Consent needs purpose and scope. At minimum, distinguish:
1. Permission to collect/store profile information.
2. Permission to store a photograph.
3. Permission to disclose selected profile fields to a potential match/family.
4. Permission to use a protected profile link.
5. Any separate consent for AI processing, if introduced.

Store who gave consent, the subject/profile, timestamp, notice/policy version, method, scope and withdrawal. Do not infer consent from possession of a photo or a family member's submission. The process for guardian/representative consent is OPEN and must be resolved before accepting profiles submitted on behalf of someone else.

Withdrawal must block future disclosures and future protected access as policy requires. It cannot retract screenshots, copied messages, or photographs already received by a third party; communicate this limitation honestly.

## 3.6 Photos and files

- Private bucket only; no public bucket for profile photographs.
- Validate file size and actual file type; do not trust filename or browser MIME alone.
- Consider image re-encoding/metadata stripping and malware controls before production.
- Use generated object names; do not expose a person's name or phone in storage paths.
- Keep photo consent/status separate from profile status.
- Generate short-lived signed URLs only after authorization, or proxy the request through a trusted function.
- Treat signed URLs as bearer credentials that can be copied while valid.
- Revoke access by disabling the share grant/consent and refusing future URL issuance; an already-issued URL may remain usable until expiry depending on storage semantics.
- Deletion and backup-retention behavior must be documented and tested.

## 3.7 Audit and logging

Audit security-meaningful events: login/account security events where available, profile create/update/status transitions, consent changes, photo upload/replacement/deletion, match decisions, share creation/access/revocation, role changes, financial transactions/corrections, bulk exports and administrative access.

Audit events should include actor, action code, target ID/type, UTC timestamp, outcome and correlation ID. Do not put full profile JSON, phone numbers, photo URLs, share tokens, credentials, message bodies or sensitive free text into logs. Logs are not the place to store the business record itself.

## 3.8 Threats to test

- Customer changes request body to use another profile ID.
- Customer writes `role=admin` or changes profile status.
- Unauthenticated visitor queries REST endpoints directly.
- Public/anonymous user guesses a photo path or share URL.
- Share token is replayed after expiry/revocation.
- One user accesses another user's records by changing URL/query IDs.
- Browser bundle accidentally includes a service-role or AI key.
- Duplicate/retried payment creates duplicate ledger entries.
- Untrusted user submits huge files or malformed registration data.
- Logs reveal private data.
- Withdrawn consent does not stop new link issuance.
- Admin/staff actions are not auditable.

No real customer data may be used until the relevant security tests pass and the owner has approved the pilot.

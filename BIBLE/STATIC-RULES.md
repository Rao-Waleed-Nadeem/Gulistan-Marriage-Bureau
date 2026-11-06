# Gulistan Marriage Bureau — Static Project Rules

**Document ID:** GMB-BIBLE-STATIC-001  
**Version:** 1.0  
**Status:** Governing rules for all contributors  
**Applies to:** Human developers, AI coding agents, reviewers and maintainers

These rules are stable project constraints. A module task may add stricter rules but must not silently weaken or contradict them. Any proposed change requires an explicit decision by the Product Owner and a recorded change to the Project Bible.

## 1. Authority and ownership

1. The approved Project Bible governs project principles and engineering rules.
2. Approved requirements and decision records govern business behavior.
3. Approved architecture and technical specifications govern implementation choices.
4. Source code is the current implementation, not proof that a requirement is satisfied.
5. Agent reports are claims to be verified, not approval evidence.
6. Nadeem is the Product Owner and approves business behavior and milestones.
7. AI agents and developers implement approved work; they do not independently redefine requirements or approve their own work.

## 2. Truthfulness and customer data

1. Never invent, infer or silently default a customer's personal facts.
2. Preserve the distinctions between known, unknown, not disclosed, not applicable and not yet collected.
3. Never assume consent. Consent must be explicit, purpose-specific where required, recorded and revocable.
4. Never use synthetic sample records in a production customer workflow.
5. Clearly identify fixtures and demo data as synthetic and keep them isolated from production.
6. Do not copy personal information into logs, analytics, URLs, test reports or public repositories.

## 3. Privacy and security

1. Customer profiles, contact details, family information, photographs and sensitive attributes are private by default.
2. Collect and disclose only information necessary for an approved purpose.
3. Frontend role checks are navigation controls, not security boundaries.
4. Enforce authorization on trusted backend services and database policies.
5. Never trust a role, user ID, token or permission supplied or fabricated by browser state.
6. Never commit passwords, API secrets, service-role keys, private keys or production credentials.
7. Never create fake login, fake magic-link verification, fake session renewal or fake account recovery.
8. A missing or unavailable authentication provider must fail closed: no protected access and no success message.
9. Use cryptographically secure mechanisms for security tokens and secrets.
10. Do not expose private photographs through permanent public URLs.
11. Security checks must inspect real configured services. Hardcoded “secure” results are prohibited.
12. Consent withdrawal and access revocation must be enforced by the backend, not only reflected in the UI.

## 4. Business authority and AI

1. Nadeem reviews and approves every AI-generated match suggestion.
2. AI must not approve, introduce or share a match autonomously.
3. Match explanations must derive only from actual recorded values and approved comparison rules.
4. Missing or undisclosed information must never be described as a match.
5. A customer's runtime classification of mandatory, preferred or acceptable criteria must be respected.
6. Financial calculations must follow the approved convention: **Net balance = Receivable − Payable**.
7. Different external matchmakers may have different approved financial arrangements.

## 5. Engineering boundaries

1. Make only changes authorized by the task scope.
2. Do not bundle broad refactoring, formatting or unrelated feature work into a focused fix.
3. Preserve existing functionality unless the task explicitly authorizes its removal or replacement.
4. Database migrations must be repeatable, reviewed and non-destructive unless explicitly approved.
5. Do not introduce a provider, paid service, dependency or architecture change without documenting the rationale and obtaining required approval.
6. Keep UI, business rules, data access, authentication, authorization, storage and integrations separated.
7. Never claim persistence when data is only held in memory.
8. Never claim delivery because a message was merely prepared or an external application was opened.
9. Never claim capacity, security, backup or recovery results without measurements or reproducible evidence.

## 6. Mandatory task workflow

Every task must contain:

- Task ID and priority.
- Requirement and defect references.
- Current behavior and evidence.
- Exact permitted files and scope.
- Prohibited changes.
- Business and security impact.
- Acceptance criteria.
- Test plan.

Execution sequence:

1. Read governing rules and relevant requirements.
2. Inspect current implementation and tests.
3. Report the plan and affected files.
4. Obtain approval for changes to architecture, data, privacy, security, business rules or scope.
5. Implement only the approved work.
6. Run relevant tests and preserve actual output.
7. Review the diff and regression risks.
8. Update the module work log and test evidence.
9. Request Product Owner acceptance.
10. Merge only after approval.

## 7. Status vocabulary

Every report must distinguish accurately between:

- Implemented
- Partially implemented
- Not implemented
- Tested successfully
- Tested unsuccessfully
- Not tested
- Unable to verify
- Awaiting Product Owner approval

A build, passing unit test, screenshot or generated document does not by itself prove production readiness.

## 8. Module completion rule

A module is complete only when its requirements are approved, its implementation is connected to the required real services, persistence and authorization are verified where applicable, relevant tests pass, documentation matches actual behavior, and Nadeem approves the evidence.

**No module may be marked complete by an AI agent on its own authority.**

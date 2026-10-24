# 5. Matching Engine and Controlled Sharing

## 5.1 Purpose and non-goals

Matching is decision support, not autonomous spouse selection. Nadeem must review every recommendation before it is shared. Basic search and rule-based matching must work without a paid AI service.

Never infer religion, aqeedah, caste, marital status, income, health, family details or other sensitive attributes from a name, photograph, location, or unrelated fields. Use only information explicitly provided, authorized, and relevant to the declared matching criteria.

## 5.2 Matching pipeline

1. **Eligibility gate:** candidate and primary profiles must be in approved eligible states; sharing consent and account/profile restrictions must be checked. Exclude self-pairs, duplicates, blocked pairs and otherwise ineligible profiles.
2. **Hard criteria:** apply only criteria explicitly classified as mandatory. If a mandatory condition is unmet, normally exclude the candidate or mark as not eligible. Any “flexible alternative” behavior must be explicit and visibly labelled.
3. **Scoring:** evaluate negotiable criteria with a documented configurable weighting model.
4. **Evidence state:** each criterion is matched, mismatched, unverified, unknown or not disclosed.
5. **Explanation:** show why a candidate was suggested, which criteria matched, what did not match and which facts are missing.
6. **Human decision:** persist approved/rejected/deferred outcome with actor, timestamp and optional reason.
7. **Fresh authorization:** re-check eligibility and consent immediately before creating any share.

## 5.3 Existing frontend logic is not authoritative

`frontend/src/utils/matchmaker.ts` currently accepts criteria from the UI and calculates a weighted percentage. `MatchReview.tsx` also contains hardcoded comparisons (for example, age difference and string checks). This is prototype behavior, not the final matching policy. Do not simply move it server-side without documenting and testing the business rules.

The SRS describes a weighted scoring model and requires hard/soft criteria, explanations, missing-data handling and human approval. The precise weights, treatment of unknown/not-disclosed values, and tie-breaking are OPEN until explicitly approved. Do not claim that a score is objective truth or a probability of marriage success.

## 5.4 Required evaluation record

Persist at least:
- Primary profile and candidate profile IDs.
- Evaluation timestamp and algorithm/configuration version.
- Eligibility result and exclusion reason code where applicable.
- Overall score (if eligible for scoring).
- Per-criterion expected value, observed/normalized state, importance, result state and safe explanation.
- Missing/unverified counts.
- Actor or process that initiated evaluation.
- Human decision and decision history stored separately.

Do not copy unnecessary sensitive data into explanations. Prefer criterion labels and short safe values; ensure the reader is authorized to see those values.

## 5.5 Fairness and sensitive criteria

The SRS permits customer-defined preferences including religion/aqeedah, caste/biradari, marital status, age, education, location and other factors. These attributes are sensitive and may be subject to legal or ethical constraints. The system must:
- Use explicit customer-stated criteria rather than inferred attributes.
- Make mandatory vs preferred distinctions visible.
- Avoid presenting a score as a guarantee or judgment of a person's worth.
- Avoid hidden criteria and unexplainable AI ranking.
- Log algorithm version and permit review of incorrect suggestions.
- Be prepared to disable a criterion if owner/legal review requires it.

## 5.6 Controlled WhatsApp message

The existing `ControlledSharingModal.tsx` and `utils/whatsapp.ts` provide useful UI behavior: field-level switches, preview and Urdu/English message formatting. Keep this experience but treat client options as a request, not authorization.

The backend must validate every requested disclosure field against:
- The staff member's permission.
- Profile status and introduction eligibility.
- Relevant consent and consent withdrawal.
- Whether the field is allowed to be disclosed for this use.
- Recipient/share scope.
- Applicable expiry/revocation rules.

Sensitive fields such as full name, salary, contact number, detailed family notes and precise location should default to withheld unless a specific approved policy says otherwise. A checkbox cannot override consent or backend policy.

## 5.7 Protected links

- Use a cryptographically strong, high-entropy random token.
- Store only a secure hash of the token in the database.
- Put no profile data, phone number or internal ID secrets in the URL.
- Enforce expiry and revocation on each access.
- Bind the grant to a fixed disclosure snapshot and intended scope.
- Rate-limit attempts and avoid revealing whether arbitrary tokens correspond to real profiles.
- Never log the raw token.
- Decide whether recipient authentication is required; this is OPEN.
- Make clear that a recipient can copy information after viewing it.

A protected link must not query the whole profile row and then rely on the frontend to hide fields. The server must return only the approved snapshot.

## 5.8 WhatsApp behavior

The system may generate a message and open a WhatsApp deep link where supported. It must not claim delivery, read receipt or recipient consent merely because the link opened. Do not implement automated bulk messaging in the initial release.

## 5.9 Acceptance tests

- Mandatory unmet criterion cannot appear as a fully eligible match.
- Unknown data is not silently treated as a match.
- A withdrawn consent blocks new share creation.
- Client request cannot add a forbidden disclosure field.
- Salary/contact/name remain omitted when not authorized.
- Expired and revoked share grants are denied.
- Changing a profile after share creation does not silently mutate the previously approved disclosure snapshot.
- Human approval is required before a match can be shared.
- The exact preview corresponds to the actual generated message and snapshot.

## 5.10 Implemented Deterministic Matching Specification (T-009)

Implemented in `frontend/src/lib/matching.ts` and tested via `src/lib/matching.test.ts` and `backend/tests/matching_engine.test.js`:
- **Algorithm Version:** `v1.0.0-deterministic`.
- **Mandatory Hard Gates (OPEN-009):**
  - Self-pairing and same-gender pairings are strictly prohibited (`SELF_PAIR_PROHIBITED`, `SAME_GENDER_PROHIBITED`).
  - Religion (`MANDATORY_RELIGION_MISMATCH`), Aqeedah (`MANDATORY_AQEEDAH_MISMATCH`), and Marital Status (`MANDATORY_MARITAL_STATUS_MISMATCH`) are strict gates. Any mismatch drops overall compatibility score to 0 and marks the candidate as ineligible.
- **Unknown Value Handling:**
  - Missing/undisclosed candidate fields receive 0 score contribution (`RELIGION_UNKNOWN`, `AQEEDAH_UNKNOWN`, `EDUCATION_UNKNOWN`).
  - If a mandatory criterion is undisclosed, the match is disqualified with an unverified reason code (`MANDATORY_RELIGION_UNVERIFIED`, `MANDATORY_AQEEDAH_UNVERIFIED`).
- **Weighted Soft Criteria:**
  - Age: in-range receives full points (`AGE_IN_RANGE`); within 2 years of the boundary receives partial 50% buffer credit (`AGE_NEAR_RANGE`); outside buffer receives 0 points (`AGE_OUT_OF_RANGE`).
  - Location/City: preferred city match receives full points (`CITY_MATCHED`); different city receives 30% partial credit (`CITY_DIFFERENT_RELOCATION_POSSIBLE`).
  - Caste/Biradari: matching biradari receives full points (`CASTE_MATCHED`); different biradari receives 50% partial credit if classified as acceptable range (`CASTE_DIFFERENT`).
- **Ranking and Deterministic Tie-Breaking:**
  - Candidates are sorted by eligibility first, overall score descending, matched criteria count descending, and candidate profile ID ascending.
- **Human Review and Match Decision Invariant:**
  - `requiresHumanApproval` is permanently `true`.
  - Review states: `pending_review`, `approved_by_nadeem`, `deferred`, `rejected`.
  - `recordMatchDecision` prevents approving ineligible matches where mandatory criteria failed (`CANNOT_APPROVE_INELIGIBLE_MATCH`) and requires authorized matchmaker credentials.

## 5.11 Implemented Controlled Disclosure & WhatsApp Proposal Engine (T-010)

Implemented in `frontend/src/lib/disclosure.ts`, wired into `frontend/src/components/matching/ControlledSharingModal.tsx`, and tested via `frontend/src/lib/disclosure.test.ts` (10 tests) and `backend/tests/controlled_disclosure.test.js` (4 tests):
- **Server Authorization of Every Field:** Client checkbox selections are treated solely as a request. Every disclosed field is validated against caller role (`canAccessRole(session, 'nadeem')`), profile status (`active` or `introduction_authorized`), and explicit candidate consent.
- **OPEN-005 Invariant (Human-Gated Introduction):**
  - For `active` profiles (pre-introduction): full legal name is withheld and replaced with display pseudonym (`LEGAL_NAME_LOCKED_PENDING_INTRODUCTION`). Direct candidate phone number is withheld and replaced with the Bureau Concierge office contact (`+92 300 0000000`) (`DIRECT_CONTACT_LOCKED_PENDING_INTRODUCTION`).
  - For `introduction_authorized` profiles: direct phone and legal names are unlocked once mutual consent and matchmaker authorization exist.
- **Client Payload Injection Prevention:** Disclosed data is assembled strictly from trusted repository attributes. Any attacker-injected fields or tampered values are completely ignored.
- **Photo Consent & 48-Hour Grant (OPEN-006):** Photographs require explicit `photoPermissionGranted`. When approved, a 48-hour signed grant token is issued (`DEFAULT_SHARE_GRANT_EXPIRY_MS`). Instant revocation is enforced via `validateShareGrant`.
- **Urdu & English Cultural Drafts:** Produces respectful, localized proposals with Islamic greetings, bulleted attributes, custom note sanitization, and dignity closing disclaimer ("آپ کے خاندان کا وقار اور رازداری ہماری اولین ترجیح ہے").
- **Audit Minimization (Section 3.7):** Audit payload (`createDisclosureAuditRecord`) records only operational telemetry (`grantId`, `authorizedFields`, `expiresAt`). Full message bodies, raw phone numbers, candidate legal names, photo URLs, and bearer tokens are strictly omitted.



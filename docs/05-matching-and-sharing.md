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

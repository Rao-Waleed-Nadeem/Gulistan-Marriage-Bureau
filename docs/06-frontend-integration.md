# 6. Frontend Integration Guide

## 6.1 Goal

Integrate persistence and authentication into the existing React + Vite frontend incrementally. Preserve the visual design, responsive behavior, Urdu/English support, and scroll animation unless a separate approved UI task changes them.

## 6.2 Do not rewrite the app

The current frontend is organized by features and includes reusable types, translations and utilities. Avoid a full rewrite. Work feature by feature and keep the UI usable while the backend is introduced.

Existing key modules:
- `src/App.tsx`: role/language state and prototype data collections.
- `src/types/index.ts`: domain types currently used by the UI.
- `src/data/mockData.ts`: synthetic fixtures.
- `src/features/matchmaker/ProfileWizard.tsx`: profile form.
- `src/features/matchmaker/NadeemDashboard.tsx`: operational dashboard.
- `src/features/matchmaker/MatchReview.tsx`: match review.
- `src/components/matching/ControlledSharingModal.tsx`: sharing UI.
- `src/features/customer/CustomerPortal.tsx`: customer portal.
- `src/features/admin/AdminPortal.tsx`: admin portal.
- `src/utils/whatsapp.ts`: message formatting.
- `src/utils/finance.ts`: money formatting and prototype ledger calculation.
- `src/utils/units.ts`: Marla/Kanal conversion.
- `src/i18n/translations.ts`: translation dictionary.

## 6.3 Introduce a typed data-access boundary

Create a small `src/lib/supabaseClient.ts` for browser-safe client initialization after the provider setup is approved. Create feature repositories/services such as profiles, preferences, photos, matches, sharing, finance and follow-ups. UI components should call these modules rather than embedding raw SQL/RLS assumptions across the component tree.

Keep DTOs separate from database rows where field names or nested relationships differ. Validate external/backend responses before using them in sensitive flows. Do not expose service-role credentials through Vite variables.

## 6.4 Suggested migration sequence

1. Add backend client/config and a connection health check without changing existing user flows.
2. Add auth/session state and remove the demo persona switcher from production mode. The switcher may remain only behind an explicit development/demo flag.
3. Add profile read/search using RLS and safe DTOs.
4. Add staff profile create/update and pending registration review.
5. Add photo upload/access through private storage.
6. Add preferences and matching evaluation.
7. Add match decisions and controlled share creation/revocation.
8. Add external matchmakers, ledger and follow-ups.
9. Add customer self-service.
10. Remove runtime dependence on `mockData.ts` in production; retain it as clearly synthetic test/demo fixtures.

Each phase must be independently reviewable and tested. Do not switch all screens to backend calls in one giant change.

## 6.5 UI and state rules

- Preserve existing component interfaces where practical; document any deliberate changes.
- Model loading, empty, validation, permission-denied, network-error and success states.
- Never show success before the backend confirms a write.
- Avoid stale closures for local list updates; backend response is authoritative.
- Do not store sensitive profile details in localStorage/sessionStorage unless a reviewed design explicitly requires it.
- Avoid logging full profile objects to console.
- Never assume that hiding a button means the action is protected.
- Use server-returned permissions to improve UI ergonomics only; the backend still authorizes every action.
- Keep all user-facing strings in the translation dictionaries and test both Urdu/RTL and English/LTR.
- Preserve accessibility, touch targets and mobile-first behavior.

## 6.6 Existing domain mismatches to address deliberately

- The current profile type uses one `photoUrl`; production should use photo metadata/storage paths and authorized URL issuance.
- `photoPermissionGranted` is too coarse to represent distinct collection, storage and disclosure consents.
- The current app creates audit entries in local state; audit history must be written by trusted operations.
- The current `ProfileStatus` combines approval, activity and introduction authorization concepts. Define a state machine before migrations.
- The current `FinancialTransaction` uses `number` and status/type values that may conflate obligations with payments. Define the ledger semantics before schema implementation.
- The current `MatchRecommendation` has a single status; human decisions, evaluation runs and sharing grants may need separate records.
- Current UI records use human names/IDs for matchmakers; production should use stable foreign keys and resolve display names separately.

## 6.7 Demo data

All data in `mockData.ts` is for prototype/demo/test use only. It must never be uploaded as real profiles, copied into production, or treated as verified. Do not use real customer records in automated tests. If sample images use external stock URLs, do not mistake those URLs for authorized profile photographs.

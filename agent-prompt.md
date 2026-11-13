# UNIVERSAL IMPLEMENTATION PROTOCOL — READ THIS FIRST

This is the reusable entry point for every Antigravity run. The legacy UI/UX prompt below is retained in full as historical/task-specific guidance; it does not override this repository-wide protocol or approved product requirements.

1. Read AGENTS.md, backend/AGENT_TASK_QUEUE.md, backend/docs/README.md and every file in backend/docs/refactor/.
2. Inspect latest remote main, local branch/status, uncommitted changes and exact source. Never assume auth or a task is complete from an old report.
3. Resume earliest IN PROGRESS task; otherwise select first READY task whose dependencies are DONE. Implement exactly one task per invocation.
4. Preserve SRS, source field meanings, existing application architecture, routes, UI, language behavior and animation. Refactor incrementally; never rebuild or silently alter business logic.
5. Preserve invariants: 100,000+ active profiles; assisted and self-service access; partner-specific matchmaker terms; staged WhatsApp/gallery migration; Android-first; Urdu RTL/English LTR; Nadeem approves every match; only explicitly approved details disclosed.
6. No fabricated facts, consent, verification, metrics or test outcomes. No client-side authorization. No service-role secrets in browser, VITE variables, Git, prompts or logs. Sensitive records are not stored offline.
7. Work directly on main: no branches/PRs, force-push or history rewrite. Preserve user changes. If safe direct commit is blocked or remote main changes concurrently, stop; never bypass protection.
8. If owner decision/account/credential/provider setting/legal or accounting approval/destructive action is required, record blocker and mark BLOCKED. Never ask owner to paste secrets into chat; use provider secret storage.
9. Use additive migrations; never edit migrations already applied to shared environments. Include RLS, grants, constraints, indexes, negative tests, mapping and rollback notes.
10. Run relevant tests/typecheck/build and staging checks when available. Distinguish unit, simulated, local, staging and live evidence. Simulation is never live success.
11. Update relevant docs, decision register, changelog, queue and work log. Commit one focused task directly to main, verify remote SHA/paths, then stop.
12. Report task/status, changes, exact test results, commit SHA, next READY task and owner actions. Never claim release-ready until all gates in backend/docs/refactor/03-ACCEPTANCE-AND-RELEASE-GATES.md are evidenced and owner acceptance recorded.

Detailed reusable prompt: backend/docs/refactor/UNIVERSAL-AGENT-PROMPT.md. Read it in full every run.

---

# GULISTAN MARRIAGE BUREAU
## Professional UI/UX Refinement, Dashboard Optimization & Usability Improvements

### ROLE

Act as a senior frontend engineer, UI/UX designer, accessibility specialist, and responsive web application architect.

Your task is to inspect, improve, and refine the existing Gulistan Marriage Bureau application to make it professional, elegant, readable, consistent, and easy for Nadeem to operate.

This is an existing application. **Improve the current implementation instead of rebuilding the application from scratch.**

Before making changes, inspect the existing project structure, frontend framework, routing, components, styles, language-management implementation, dashboard, follow-up pages, profile views, matching pages, and navigation system.

Understand the existing architecture before modifying it.

Preserve working functionality, existing routes, database integrations, authentication, business logic, and established design conventions wherever possible.

Do not replace functional features with static mockups or introduce unnecessary dependencies.

---

# 1. CRITICAL REQUIREMENT: PERMANENT LANGUAGE PERSISTENCE

Implement a reliable, application-wide language preference system.

The selected language must persist when the user:

- Navigates from the dashboard to another page.
- Opens a profile.
- Searches for suitable matches.
- Visits follow-ups.
- Refreshes the browser.
- Closes and reopens the application.
- Signs out and signs back in, if the preference is associated with the authenticated user.

### Required behavior

1. If Nadeem selects Urdu, the application must remain in Urdu across all pages and subsequent sessions.
2. If Nadeem selects English, the application must remain in English across all pages and subsequent sessions.
3. Never reset the language merely because the user navigates to a different route.
4. Do not initialize the language independently inside individual pages.
5. Use one centralized, persistent language-preference mechanism.
6. Persist the preference in the authenticated user's settings when the existing backend supports this.
7. Use localStorage as a practical fallback for guest sessions or when account-level preferences are unavailable.
8. Resolve language precedence consistently: authenticated user preference, then persisted local preference, then the existing application default.
9. Prevent hydration mismatches and unwanted flashes of the wrong language during page initialization.
10. Do not overwrite an existing saved preference with the default language during application startup.

### Urdu and RTL support

When Urdu is selected:

- Set the appropriate document language and RTL direction.
- Mirror navigation and directional interface elements where appropriate.
- Use a readable Urdu-compatible font.
- Ensure Urdu labels, forms, buttons, dropdowns, and cards render correctly.
- Preserve the correct alignment and display of phone numbers, dates, profile IDs, and other mixed-direction data.
- Keep telephone numbers and numeric values readable without unwanted character reordering.

When English is selected:

- Restore the appropriate LTR layout.
- Use consistent English terminology throughout the application.

All routes must use the same language-management system.

**Acceptance criterion:** Selecting a language once must not require selecting it again on every page.

---

# 2. DASHBOARD HERO: TRANSPARENT GLASS CAPSULES

On the dashboard only, improve the presentation of the following existing heading:

"Lead Matchmaker Operational Desk"

"Nadeem’s Matchmaker Desk"

"Quick operational access designed for comfortable mobile & desktop workflow"

Place this content inside an elegant, translucent glass-style container.

### Visual direction

Create a premium glassmorphism design inspired by frosted glass and softly blurred water-like transparency.

The container should feature:

- A translucent background.
- A subtle backdrop blur.
- A refined, low-opacity border.
- Soft shadows and restrained depth.
- Excellent foreground-to-background contrast.
- Rounded corners with a consistent radius.
- Appropriate internal padding.
- Clear typography and spacing.
- A polished appearance consistent with the existing Gulistan brand.

Use a CSS-based implementation with properties such as `backdrop-filter: blur(...)` and a translucent background where appropriate.

Provide a readable fallback for browsers that do not support backdrop filters.

Do not make the glass effect so transparent that text becomes difficult to read.

Do not introduce excessive glow, heavy gradients, distracting animations, or a visually cluttered appearance.

### Important implementation detail

Keep the three heading elements inside a visually coherent glass container. If separate capsules improve readability, use a restrained hierarchy rather than placing every line inside an unrelated decorative box.

The heading and description must remain readable on both mobile and desktop screens.

### Scope restriction

**This hero container belongs exclusively to the dashboard.**

Do not display it on the follow-up page, profile pages, best-match page, or other routes.

Use the existing route structure to render the dashboard-specific hero only on the dashboard.

Do not duplicate the dashboard heading across the application.

---

# 3. DASHBOARD QUICK-ACTION CARDS

The dashboard contains important actions such as:

- Add New Profile.
- Find a Suitable Match.
- Review New Registrations.
- Manage Follow-ups.
- Other existing dashboard actions.

Keep these actions visible on the dashboard in a professional card-based layout.

### Design requirements

1. Use large, clearly identifiable action cards.
2. Give each card a descriptive title and a short supporting description where appropriate.
3. Use consistent icon sizing, spacing, borders, and typography.
4. Make the entire card clickable when appropriate.
5. Provide visible hover, focus, pressed, and active states.
6. Use comfortable touch targets on mobile.
7. Keep the layout responsive across desktop, tablet, and mobile.
8. Ensure that the cards remain visually distinct from the background.
9. Use clear contrast rather than relying exclusively on shadows or color.
10. Preserve the existing functionality and destinations of every action.

### Remove duplicate desktop navigation

The current desktop layout displays two sets of navigation or quick-action controls:

- A large set of cards near the dashboard heading.
- Another navigation menu beneath those cards.

This creates unnecessary duplication and consumes valuable screen space.

**Remove the redundant secondary menu beneath the large dashboard action cards.**

The dashboard cards should remain the primary quick-action interface on the dashboard.

However, do not accidentally remove the application's global navigation, page routing, or essential access to other sections.

Before deleting anything, identify whether the lower menu is a duplicate navigation component or a necessary global navigation element.

Remove only the redundant dashboard presentation.

On other pages, display the appropriate global navigation according to the rules in this prompt.

---

# 4. ACTIVE NAVIGATION: CLEAR BLUE-AND-WHITE STATE

Improve the visual feedback for the current page.

Whenever Nadeem navigates to another section, the corresponding navigation item must become clearly active.

### Active-state requirements

- Use a professional blue background with white text for the active navigation item.
- Use an appropriate blue shade that fits the existing brand and provides sufficient contrast.
- Ensure icons also remain visible against the active background.
- Give inactive items a quieter, neutral appearance.
- Use consistent active-state styling across all applicable navigation components.
- Support keyboard focus and hover states without confusing them with the persistent active state.
- Preserve the active state after a browser refresh.
- Determine the active route from the actual application routing system.

The previous page must no longer appear active after successful navigation.

Do not use hardcoded active states that remain attached to the dashboard regardless of the current route.

### Navigation consistency

The active-state logic must work for:

- Dashboard.
- Add Profile.
- Profile Management.
- Best Match.
- Follow-ups.
- Any other existing primary navigation destinations.

Use the actual routes present in the project.

Do not invent new routes unless required and justified.

---

# 5. FOLLOW-UP PAGE: IMPROVE READABILITY AND VISUAL HIERARCHY

The current follow-up interface uses text that is too small, visually uninteresting, and difficult for Nadeem to scan.

Redesign it to prioritize readability, quick comprehension, and practical daily use.

Nadeem should be able to identify a customer, understand the current follow-up status, recognize the next action, and locate the relevant contact information without struggling to read the interface.

### A. Increase text readability

Review the entire follow-up page, including:

- Page headings.
- Customer names.
- Phone numbers.
- Follow-up dates.
- Status labels.
- Notes.
- Action buttons.
- Secondary descriptions.
- Empty states and supporting messages.

Use a consistent typographic hierarchy.

Recommended starting points for desktop:

- Page heading: approximately 26–32 px.
- Customer name: approximately 19–23 px.
- Important contact information: approximately 16–18 px.
- Main supporting text: approximately 15–17 px.
- Secondary metadata: generally at least 14 px.

These are starting values, not rigid rules. Adjust them to the existing design system and actual device dimensions.

Avoid tiny text and excessive information density.

### B. Emphasize important information

Make these elements especially easy to identify:

**Customer name**
- Use a stronger font weight.
- Provide clear visual prominence.
- Avoid truncating names unnecessarily.

**Phone number**
- Use a readable font size.
- Present it as a recognizable contact element.
- Keep it visually distinct from secondary metadata.
- Make it clickable using an appropriate telephone link when supported.
- Add a convenient copy action if it fits the existing workflow.
- Preserve the original stored phone number.

**Follow-up date**
- Display it prominently.
- Use a clear date format consistent with the selected language.
- Highlight overdue follow-ups with a restrained warning treatment.
- Distinguish today's follow-ups from upcoming follow-ups.
- Never rely on color alone to convey urgency.

### C. Improve follow-up cards

Prefer clean, well-spaced cards over dense, spreadsheet-like layouts when this fits the existing workflow.

Each card should prioritize:

1. Customer name.
2. Phone number, subject to existing permissions.
3. Follow-up date and time, if available.
4. Current follow-up status.
5. Short, relevant notes.
6. The next required action.

Use clear visual grouping and sufficient whitespace.

Keep secondary information accessible without overwhelming the initial view.

### D. Make actions obvious

Use descriptive action labels, for example:

- View Profile.
- Call Customer.
- Edit Follow-up.
- Mark as Completed.
- Schedule Next Follow-up.

Only introduce an action if it is supported by the existing business logic.

Do not make important actions icon-only.

Ensure that buttons are large enough to use comfortably on a phone.

### E. Preserve functionality

Do not remove existing follow-up functionality, stored records, filtering, status updates, or scheduling behavior.

Improve the presentation while retaining the underlying workflow.

---

# 6. PROFILE PRESENTATION: BEAUTIFUL SUMMARY, DETAILED FULL VIEW

Improve the profile cards and profile detail page to create a clear distinction between summary information and complete profile information.

The initial view should feel like a premium matchmaking profile rather than an administrative record.

## A. Profile summary cards

When Nadeem browses profiles, prioritize the information needed to identify and evaluate a candidate quickly.

Show:

1. Profile photograph, when available and authorized.
2. Name.
3. Age.
4. City or current residence at the appropriate level of detail.
5. A small selection of genuinely important additional details, when useful.
6. Profile status or verification indicator where relevant and authorized.
7. A clear action to open the complete profile.

### Photograph design

Make the profile photograph noticeably larger and more visually prominent than it is currently.

Requirements:

- Use a consistent image aspect ratio.
- Use appropriate cropping without distorting faces.
- Provide a graceful placeholder when no photograph is available.
- Maintain consistent image sizing across cards.
- Preserve authorization checks for private photographs.
- Do not expose private images through public URLs or unauthorized caching.
- Respect existing photo-consent rules.

Use a clean, elegant card layout with restrained borders, subtle shadows, and generous spacing.

### Summary information

Do not overload profile cards with every field stored in the database.

The purpose of a summary card is to support quick scanning.

Keep long family descriptions, detailed property information, extensive education history, siblings' records, and other secondary information out of the compact summary unless the existing workflow specifically requires them.

The selected fields must come from actual profile data. Never invent missing values.

## B. Complete profile view

When Nadeem opens a profile, display the full information in a well-organized detail page.

Group the information into meaningful sections, such as:

- Personal Information.
- Education and Employment.
- Family Background.
- Siblings and Their Details.
- Parents.
- Property and Home.
- Lifestyle and Special Qualities.
- Marriage Preferences.
- Photographs.
- Contact Information.
- Administrative Information.
- Verification and Consent.
- Profile History, if already supported.

Use expandable sections where appropriate, but keep the most important information visible by default.

Avoid presenting all information as one enormous, uninterrupted text block.

Use readable labels, clear values, consistent spacing, and appropriate section headings.

### Privacy requirements

Respect existing role-based permissions and field-level disclosure rules.

Sensitive contact information and photographs must only be shown to authorized users.

Do not weaken existing privacy controls to improve the appearance of the interface.

---

# 7. BEST MATCH PAGE: STICKY SEARCH AND ADVANCED MULTI-FILTERING

The Best Match page must allow Nadeem to search and refine results without repeatedly scrolling back to the top.

This is a high-priority usability improvement.

## A. Sticky search toolbar

Create a search and filtering toolbar that remains visible near the top of the viewport while the results list scrolls.

### Positioning

The toolbar must:

- Remain directly below the existing application header or navbar.
- Stay visible while scrolling through candidate results.
- Respect the actual header height.
- Use an appropriate stacking order so it does not disappear behind other elements.
- Avoid covering the first result or other important content.
- Work correctly on desktop, tablet, and mobile.
- Account for any fixed or sticky elements already present.
- Avoid introducing unnecessary nested scrolling containers.

Use the existing header rather than creating a duplicate header.

A suitable implementation may use CSS sticky positioning, provided that the surrounding layout does not prevent it from working.

The toolbar should have a solid or sufficiently opaque background so search controls remain legible while results move behind it.

## B. Search capabilities

Provide a clear, prominent search field that can search relevant profile information supported by the existing application.

Where appropriate, search should support:

- Profile name.
- City or residence.
- Profile ID.
- Other searchable fields already implemented.

Do not silently expand search to restricted or unauthorized fields.

Provide a clear search action or appropriate debounced search behavior.

Avoid sending a request on every keystroke without reasonable control.

Display a visible loading state when searching.

## C. Multiple simultaneous filters

Provide a well-organized filter interface that allows Nadeem to apply multiple filters at the same time.

Use the existing profile schema and matching criteria.

Relevant filters may include:

- Minimum and maximum age.
- City or location.
- Marital status.
- Education.
- Occupation.
- Religion, when applicable and authorized.
- Caste or biradari, when applicable and authorized.
- Other existing profile or matching criteria.

Do not introduce filters for fields that are not supported by the current data model without first determining whether the necessary data already exists.

### Multi-selection behavior

Where a filter supports multiple values, allow Nadeem to select several options.

For example, the location filter may permit several selected cities, while education may allow multiple acceptable qualifications.

The interface should make selected values obvious.

Use checkboxes, multi-select controls, searchable dropdowns, or removable filter chips according to what best fits the existing component system.

Avoid creating an unnecessarily complicated filter panel.

## D. Selective filter removal

Nadeem must be able to remove a single selected filter without resetting all other filters.

For example:

- Remove one selected city while keeping the selected age range.
- Remove one education option while keeping the other education options.
- Change the minimum age without losing the maximum age.
- Clear the search text without removing the selected filters, unless the user explicitly chooses a combined reset.

Represent active filters as removable chips or another clearly understandable interface.

Each chip should have a clear removal control.

The interface must update the results when an individual filter is removed.

### Required behavior

1. Applying multiple filters combines them according to their defined semantics.
2. Removing one filter preserves the other active filters.
3. Changing one filter does not reset unrelated filter selections.
4. Clearing the search text does not unexpectedly clear the filters.
5. A dedicated Reset All action clears the search and all selected filters.
6. Reset All requires no unnecessary confirmation because it only changes search criteria, not stored profile records.
7. Display the active-filter count where useful.
8. Keep selected values synchronized between the filter controls, active-filter chips, and actual search request.
9. Provide clear loading, no-results, and error states.

## E. Filter semantics and matchmaking correctness

Do not implement all filters using one arbitrary matching rule.

Determine the appropriate behavior for each filter.

For example:

- Minimum and maximum age define a numeric range.
- Multiple selected cities may mean any selected city is acceptable.
- Multiple acceptable education levels may mean any selected level qualifies.
- Different filter categories are generally combined to narrow the result set.
- Existing mandatory marriage preferences must continue to be respected by the matching engine.

Preserve the application's established matching logic and business rules.

Do not confuse profile-search filters with a customer's marriage preferences.

If the existing application distinguishes mandatory requirements from flexible preferences, preserve that distinction.

Filtering and sorting must operate on actual results, not merely update the interface appearance.

## F. Performance

Use the existing backend search capabilities where available.

Avoid loading every profile into the browser when the database contains a large number of records.

Use server-side filtering and pagination when appropriate.

Preserve compatibility with the project's long-term target of at least 100,000 active profiles.

Do not claim that performance targets have been met unless they have been tested.

---

# 8. BACKGROUND CLARITY CONTROL: HAMBURGER MENU ONLY

The existing background-clarity or background-appearance control must be accessible through the hamburger menu rather than being displayed permanently across the interface.

### Required placement

1. Place the control inside the existing hamburger menu.
2. Position it near the bottom of the menu, preferably in a dedicated settings area.
3. Use an appropriate location that remains visible and easy to reach.
4. Do not let the control obscure navigation links.
5. Ensure the menu remains scrollable when necessary.
6. Make the control work on both desktop and mobile.
7. Do not display a duplicate version of this control elsewhere in the main application interface.

If the menu already contains a settings section, reuse it.

### Control behavior

Preserve the existing background-clarity feature and improve its usability.

If the feature controls background transparency, blur, or visual clarity, give it a clear label and an understandable control.

The setting should visibly update the interface.

Persist the user's chosen setting if the existing architecture supports persistent appearance preferences.

The selected setting must not reduce text readability or the contrast of important buttons.

Respect the current theme and design system.

Do not confuse background clarity with the overall application theme or language preference.

If the existing implementation has no functioning background-clarity behavior, inspect the code and implement the smallest appropriate solution without introducing unrelated visual settings.

---

# 9. RESPONSIVE DESIGN: REMOVE DESKTOP DUPLICATION WITHOUT BREAKING MOBILE

Review the dashboard and navigation at the following representative viewport sizes:

- Small mobile: 320–375 px.
- Standard mobile: 390–430 px.
- Tablet: approximately 768 px.
- Laptop: approximately 1024–1440 px.
- Large desktop: 1600 px and above.

These are test targets, not a requirement to create separate layouts for every exact width.

### Desktop

- Display the dashboard hero and primary quick-action cards.
- Remove the redundant second row of dashboard navigation cards.
- Maintain a single, coherent global navigation system.
- Ensure the page does not display duplicate menus.
- Use the available width without stretching content excessively.
- Keep content readable and well balanced.

### Mobile

- Prioritize essential actions.
- Use touch-friendly cards and controls.
- Avoid horizontal overflow.
- Keep headings readable without awkward wrapping.
- Make the Best Match search toolbar usable on narrow screens.
- Ensure the hamburger menu and its settings remain accessible.
- Preserve the intended Urdu RTL layout.
- Do not sacrifice functionality simply to fit everything on one screen.

Use responsive CSS and existing breakpoints where possible.

Do not introduce device-specific hacks unless genuinely necessary.

---

# 10. DESIGN SYSTEM AND PROFESSIONAL VISUAL CONSISTENCY

The application should feel like one coherent, carefully designed product.

Maintain the existing Gulistan brand identity while improving its execution.

The desired experience is:

- Trustworthy.
- Premium.
- Calm.
- Warm.
- Modern.
- Easy to understand.
- Comfortable to use for extended periods.
- Appropriate for a professional marriage bureau.

### Typography

Use a consistent typography scale.

Make important names, dates, phone numbers, headings, and primary actions easy to identify.

Ensure that Urdu and English text remain readable at their respective font sizes.

Avoid excessive font weights and unnecessary decorative typography.

### Spacing

Use consistent spacing between cards, headings, controls, labels, and content sections.

Avoid cramped layouts and excessively large empty spaces.

### Colors

Use the existing design tokens where available.

Maintain consistent colors for:

- Primary actions.
- Secondary actions.
- Active navigation.
- Success states.
- Warning states.
- Error states.
- Neutral metadata.
- Background surfaces.

Use the blue-and-white active navigation state requested above without making unrelated components visually inconsistent.

### Components

Reuse or refine existing shared components where practical.

Avoid creating slightly different versions of the same button, card, heading, or input on every page.

### Motion

Use subtle transitions only where they improve feedback.

Avoid distracting animations and unnecessary movement.

Respect reduced-motion preferences.

### Accessibility

- Use sufficient text and control contrast.
- Keep interactive targets comfortably sized.
- Provide visible keyboard focus.
- Use semantic HTML.
- Associate form fields with accessible labels.
- Support keyboard navigation.
- Do not rely on color alone for status communication.
- Ensure sticky elements do not obscure focused controls.
- Respect browser zoom and text scaling.

---

# 11. TECHNICAL IMPLEMENTATION RULES

Before changing code, inspect:

1. Application entry points and routing.
2. Existing global layout and header.
3. Dashboard components.
4. Follow-up components.
5. Profile cards and profile detail pages.
6. Best Match search and filtering logic.
7. Language localization and persistence.
8. Hamburger menu and appearance controls.
9. Shared styles, design tokens, and responsive breakpoints.
10. Existing tests and build commands.

Then implement the changes in a controlled manner.

### Architectural requirements

- Reuse existing components and libraries where reasonable.
- Centralize language state rather than implementing it separately per page.
- Derive active navigation state from the actual route.
- Keep dashboard-only components out of unrelated pages.
- Avoid duplicate global navigation components.
- Preserve existing business logic and backend integrations.
- Keep search state and filter state consistent.
- Avoid unnecessary full-page reloads.
- Avoid broad, unrelated refactoring.
- Do not replace real data with mock data.
- Do not hardcode customer records or phone numbers.
- Do not remove existing features without a clear reason.
- Do not weaken authentication, authorization, or privacy protections.
- Do not introduce paid dependencies without approval.
- Do not leave placeholder controls that appear functional but do nothing.

### CSS and component quality

Prefer maintainable styles and shared design tokens.

Avoid:

- Repeated conflicting CSS overrides.
- Excessive use of `!important`.
- Arbitrary absolute positioning for primary layouts.
- Fragile DOM-dependent behavior.
- Duplicated language dictionaries.
- Hardcoded active navigation states.
- Unnecessary global event listeners.
- Sticky positioning that fails because of parent overflow rules.
- Decorative blur that compromises text readability.

Use the existing framework's recommended patterns.

Do not migrate the application to a different framework simply to implement these improvements.

---

# 12. REQUIRED TESTING

After implementing the changes, run the available tests, linting, type checking, and production build.

Add or update tests where practical.

### A. Language persistence

Verify that:

- Urdu remains selected when navigating between pages.
- English remains selected when navigating between pages.
- The selected language survives browser refresh.
- The saved preference is not overwritten by the default language.
- RTL and LTR layouts switch correctly.
- Phone numbers and dates remain readable in Urdu mode.

### B. Dashboard

Verify that:

- The glass-style hero appears only on the dashboard.
- The three specified heading elements are displayed correctly.
- Dashboard quick-action cards work.
- The redundant secondary dashboard menu is removed.
- Essential global navigation remains available.
- No dashboard-only content appears on unrelated routes.

### C. Active navigation

Verify that:

- The correct item becomes active after navigation.
- The active item uses a blue background and white text.
- The previous page loses its active state.
- Active states work after refreshing a route.
- Navigation remains consistent across supported screen sizes.

### D. Follow-ups

Verify that:

- Names, phone numbers, and dates are easy to scan.
- Important text is not excessively small.
- Overdue and upcoming follow-ups are distinguishable.
- Existing follow-up actions continue to work.
- No important content is clipped on mobile.

### E. Profiles

Verify that:

- Profile photographs are larger and consistently displayed.
- Name, age, and city are visible in the summary.
- Missing photographs use a suitable placeholder.
- The full profile displays all relevant authorized details.
- Sensitive information remains protected.
- Existing profile actions continue to work.

### F. Best Match

Verify that:

- The search toolbar remains visible while scrolling.
- The toolbar stays below the existing header.
- Search results update correctly.
- Multiple filters can be applied simultaneously.
- Multiple values can be selected where supported.
- One filter can be removed without clearing unrelated filters.
- Reset All clears the search and all filters.
- Clearing the search text does not unexpectedly remove filters.
- No-results and loading states are clear.
- Filtering uses actual data and the established matching rules.

### G. Background clarity

Verify that:

- The control appears in the hamburger menu.
- It is not duplicated elsewhere.
- It works on desktop and mobile.
- The chosen setting is visibly applied.
- Text and button contrast remain acceptable.

### H. Responsive regression testing

Check the application at representative mobile, tablet, laptop, and large desktop widths.

Look for:

- Horizontal overflow.
- Overlapping menus.
- Duplicate navigation.
- Clipped cards.
- Unreadable text.
- Broken sticky positioning.
- Incorrect RTL alignment.
- Controls that cannot be reached on mobile.

---

# 13. ACCEPTANCE CRITERIA

The task is complete only when all the following conditions are satisfied:

1. The language preference persists across routes and browser sessions.
2. The dashboard hero uses a readable translucent glass-style design.
3. The hero appears exclusively on the dashboard.
4. The primary dashboard action cards remain functional.
5. The redundant second dashboard menu is removed without breaking global navigation.
6. The current page is highlighted using the requested blue-and-white active state.
7. The follow-up page has a clear typographic hierarchy.
8. Customer names, phone numbers, and follow-up dates are easier to identify.
9. Profile summaries emphasize a larger photograph, name, age, and city.
10. The complete profile view retains the relevant authorized details.
11. The Best Match search toolbar remains accessible during scrolling.
12. Multiple filters can be selected and combined.
13. Individual filters can be removed without resetting the others.
14. Reset All works predictably.
15. The background-clarity control is available through the hamburger menu only.
16. The interface is responsive and usable in Urdu and English.
17. Existing functionality, data integrations, and privacy controls remain intact.
18. Available automated checks and the production build complete successfully, or any existing failures are clearly documented.

---

# 14. IMPLEMENTATION WORKFLOW

Follow this sequence:

**Step 1 — Inspect**

Examine the existing codebase and identify the components responsible for each requested behavior.

**Step 2 — Plan**

Prepare a short implementation plan that identifies the relevant files, shared components, dependencies, and potential regression risks.

**Step 3 — Implement**

Make the changes in coherent, manageable groups.

Prioritize language persistence, dashboard navigation duplication, active route states, Best Match search usability, and follow-up readability.

Then refine the profile presentation, glass effect, background-clarity placement, and responsive styling.

You may adjust the order when the existing architecture requires it.

**Step 4 — Test**

Run the available automated checks and verify the actual page behavior.

Do not consider a visual change complete merely because its CSS has been written.

**Step 5 — Correct**

Fix any regressions, broken routes, inconsistent states, overflow, or readability problems discovered during testing.

**Step 6 — Report**

Provide a concise implementation report containing:

- What was changed.
- Which files or components were modified.
- How language persistence was implemented.
- How the duplicate dashboard menu was resolved.
- How search filters and selective removal work.
- What responsive checks were performed.
- Which automated tests and build commands were run.
- Any tests that failed or could not be performed.
- Any remaining issues or decisions requiring approval.

Do not claim that a test passed unless it was actually executed and passed.

Do not stop after presenting a plan or screenshots. Implement the requested changes in the existing codebase and verify them.

## FINAL INSTRUCTION

Make the application feel noticeably more professional, attractive, and easier for Nadeem to use without introducing unnecessary complexity.

**Prioritize readability, clear navigation, persistent preferences, correct functionality, responsive behavior, and privacy over decorative effects.**

Preserve the existing application's working features and business logic. Make focused, production-minded changes, test them, and report the actual results.
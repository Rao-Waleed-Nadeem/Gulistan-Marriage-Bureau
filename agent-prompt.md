# ANTIGRAVITY IMPLEMENTATION PROMPT — GULISTAN UX, NAVIGATION & ANIMATION REFINEMENT

## Role and mission

Act as a senior frontend engineer, UI/UX specialist, browser performance engineer, and accessibility reviewer working on the existing Gulistan Marriage Bureau website.

The website already has its architectural background, blue luxury color palette, transparent glass components, blur effects, and implemented scrolling animation. Do not rebuild the website or replace its existing visual identity.

Your task is to diagnose and fix five specific problems:

1. The navbar is too slim vertically for its current text size.
2. The background scrolling animation is noticeably choppy and must become smooth.
3. Navbar items are not reliably clickable or navigable.
4. Some navigation labels wrap onto a second line when they should remain on one line.
5. Text is too small in several places, and certain text becomes difficult to read over transparent or blurred components when the animated background passes behind it.

Make changes directly in the existing project. Inspect the real application and its source code, identify the causes, implement the fixes, and verify the results in a browser.

**Important: Fix the underlying causes rather than hiding symptoms with arbitrary CSS changes.**

---

## 1. Preserve the existing design and functionality

Keep the established Gulistan visual identity:

- Midnight navy and architectural blue.
- Dusty blue and pale blue-grey accents.
- Warm sandstone, cream, ivory, and muted gold.
- Existing architectural background artwork.
- Existing glassmorphism and transparent surfaces.
- Existing component shapes, branding, and overall page structure.

Do not return to the old greenish theme.

Do not replace the background artwork, generate a different background, or redesign the website from scratch.

Do not indiscriminately remove transparency or blur. These are part of the intended visual style. Correct the specific readability problems where they occur.

Avoid unrelated modifications to routes, authentication, business logic, content, and existing workflows.

Use the smallest coherent set of changes that solves the problems.

## 2. Inspect the running website before editing

First inspect the repository and launch the existing application using its current development workflow.

Identify:

- The navbar component and its shared styles.
- The actual font family, font sizes, line heights, and font weights.
- The existing background animation implementation.
- Whether the background uses a video, a sequence of image frames, a canvas, or CSS movement.
- The current scroll event handlers, animation loops, image-loading strategy, and frame-rendering logic.
- All navbar destinations and their corresponding page sections or routes.
- The glass components where text readability is poor.
- Existing responsive breakpoints and English/Urdu direction handling.

Capture a baseline screenshot and observe the animation during actual scrolling.

Use browser inspection and performance profiling where available. Do not assume that FPS is the cause until the rendering implementation has been examined.

Then implement the changes and compare the result with the baseline.

---

## 3. Make the navbar vertically more spacious

The current navbar feels too slim relative to the size of its text.

Increase its vertical breathing room so it feels balanced, premium, and comfortable to use.

### Requirements

- Increase the capsule's vertical padding or minimum height moderately.
- Allow slightly more space above and below the navigation labels.
- Keep the current horizontal alignment, capsule shape, and visual style.
- Maintain the established transparent glass treatment and blue luxury palette.
- Preserve the existing logo, logo proportions, brand name, and actions.
- Ensure the navbar text is vertically centered.
- Keep the logo and buttons aligned with the navigation items.
- Maintain sufficient spacing between navigation items.
- Ensure the larger navbar does not crowd the hero heading or overlap important content.

Start by increasing the existing navbar's vertical spacing by a modest amount, approximately 10–20% where appropriate, then refine it against the actual viewport.

Do not simply increase the navbar height with a fixed value if that creates unnecessary empty space or breaks responsive layouts.

Use the existing CSS variables and component styles where possible.

### Scroll-state behavior

If the navbar already changes appearance on scroll, preserve that behavior and refine it only where necessary.

Both its initial and scrolled states must have enough vertical padding for the text.

Avoid a dramatic height change during scrolling. The transition must remain visually stable without pushing page content around.

---

## 4. Fix navigation wrapping: every item must stay on one line

Some navbar labels currently wrap onto a second line. This looks unprofessional and makes the navbar feel cramped.

All individual navigation labels must remain on a single line at supported desktop and tablet viewport widths whenever the layout has enough room.

### Implementation

- Apply `white-space: nowrap` to individual navigation labels.
- Prevent navigation items from shrinking until their text wraps.
- Use appropriate flexbox alignment and spacing.
- Remove conflicting width constraints that force labels to break.
- Review the available horizontal space occupied by the logo, navigation, and action buttons.
- Adjust gaps and responsive breakpoints intelligently.
- Ensure the navbar's overall layout remains balanced.

Do not solve the problem by making every font smaller.

Do not force the entire navbar beyond the viewport width.

Do not hide important navigation items or allow horizontal page scrolling.

If the viewport is too narrow for the full desktop navbar, switch to the existing mobile navigation or implement a compact, accessible menu at an appropriate breakpoint.

On desktop, keep the navigation in a single horizontal row. On mobile, use a deliberate responsive navigation pattern rather than squeezing every item into an unusable space.

Test long labels such as “Privacy & Trust” and “Register Profile” along with the remaining navigation items.

Verify both the initial navbar and its scrolled state.

---

## 5. Repair every navbar item's click behavior

Navbar items currently appear not to work reliably.

Investigate each item and determine its intended destination before modifying the implementation.

### Required behavior

Every visible navbar item must have a working, intentional action.

Examples:

- Home navigates to the homepage.
- Our Approach navigates to the appropriate existing page or section.
- How It Works opens the corresponding page or section.
- Privacy & Trust navigates to its existing destination.
- Contact Us opens the intended contact page or section.
- Sign In opens the existing sign-in workflow.
- Register Profile opens the existing registration workflow.
- The language control opens or changes the existing language interface.
- The visitor or account control opens its existing menu or performs its existing action.

Use the actual routes and component structure found in the project. These examples do not authorize inventing new pages or replacing existing workflows.

### Diagnose the real failure

Check for:

- Missing or incorrect `href` values.
- Buttons without working event handlers.
- Placeholder links such as `href="#"`.
- Incorrect route paths.
- Missing section IDs.
- Click handlers that do not execute.
- Overlays or background canvases intercepting pointer events.
- Incorrect `pointer-events` rules.
- Incorrect stacking contexts or z-index values.
- Event propagation problems.
- Broken mobile-menu state.
- JavaScript errors that prevent navigation.
- Fixed headers obscuring anchor destinations.

Fix the underlying cause.

If a navigation item points to an existing page, use the application's established routing mechanism.

If it points to a section on the same page, connect it to the actual section ID and implement smooth anchor navigation if appropriate.

If a destination does not exist, inspect the existing application to determine the correct destination. Do not invent a destination or create a dummy page simply to make the link appear functional.

### Clickability and accessibility

- Use semantic anchors for navigation.
- Use buttons for actions and menus.
- Keep interactive elements above decorative backgrounds.
- Ensure decorative animation layers cannot intercept clicks.
- Preserve visible focus indicators.
- Support keyboard activation.
- Ensure mobile menu items close the menu appropriately after navigation.
- Avoid nested interactive elements.
- Test all visible navbar items individually.

Do not report that navigation works unless the links have actually been tested in the running application.

---

## 6. Diagnose and fix the choppy background scrolling animation

This is a high-priority task.

The existing background animation is not smooth during scrolling. The cause may involve frame rate, decoding delays, scroll event handling, rendering cost, scaling, or competing animation mechanisms.

Do not assume that increasing FPS alone will solve it.

### Step A — Diagnose

Inspect the actual animation implementation.

Determine whether it uses:

- A sequence of 300 image frames.
- A video.
- Canvas rendering.
- A CSS background or image.
- Scroll-synchronized frame selection.
- Continuous autoplay.
- A combination of multiple animation systems.

Profile the running page while performing:

1. Slow downward scrolling.
2. Fast downward scrolling.
3. Slow upward scrolling.
4. Fast upward scrolling.
5. Repeated small scroll movements.
6. Window resizing while the animation is active.

Look for:

- Dropped frames.
- Long main-thread tasks.
- Excessive scroll event callbacks.
- Repeated image decoding.
- Images that are not loaded when needed.
- Layout recalculations.
- Expensive blur or filter operations.
- Multiple animation loops.
- Competing autoplay and scroll-scrubbing logic.
- Incorrect frame-index calculations.
- Background jumps caused by viewport resizing.
- Large DOM structures containing individual animation frames.

Identify the bottleneck before selecting the solution.

### Step B — Preserve the intended animation behavior

Keep the existing artwork and determine how the current experience is intended to work.

If the background is scroll-scrubbed, scrolling down should advance through the frames and scrolling up should reverse through them predictably.

If the background is intended to play continuously, preserve that model and optimize its playback.

Do not introduce competing animation systems that repeatedly overwrite the same background position or frame index.

Do not make the background advance randomly or jump between unrelated frames.

### Step C — Optimize frame rendering if the source is a frame sequence

If the existing implementation uses the supplied 300-frame sequence:

- Preserve the correct frame order.
- Avoid placing hundreds of full-size images in the active DOM.
- Use a dedicated rendering layer, with canvas as an option when appropriate.
- Preload an initial subset of frames.
- Decode upcoming frames progressively.
- Avoid waiting for the entire sequence before rendering the page.
- Avoid rendering blank frames when assets are not ready.
- Use the last valid frame or a suitable poster as a fallback.
- Use `requestAnimationFrame` for visual updates where appropriate.
- Coalesce rapid scroll updates so that only the most recent required frame is rendered.
- Avoid unnecessary redraws when the requested frame has not changed.
- Clamp progress and frame indices to valid ranges.
- Keep the rendering independent from normal document layout.
- Clean up event listeners and animation loops when components unmount.

If decoding and rendering are the bottleneck, consider preprocessed, appropriately sized frame variants for mobile devices while preserving the original high-quality assets.

Do not synchronously decode the entire sequence on the main thread.

### Step D — Optimize scroll processing

- Keep scroll callbacks lightweight.
- Avoid expensive React state updates for every raw scroll event when a rendering-oriented approach is more appropriate.
- Avoid triggering layout recalculations in the animation loop.
- Use a consistent normalized progress calculation if the animation is scroll-linked.
- Make reverse scrolling behave as smoothly as forward scrolling.
- Prevent competing requestAnimationFrame loops.
- Do not run unnecessary continuous animation when the page is hidden.
- Preserve responsive background scaling and crop behavior.

Do not apply `will-change` indiscriminately to large page sections.

Do not apply continuous GPU transforms or filters without a performance justification.

### Step E — Verify performance

Use browser performance tools if available.

Check whether the animation approaches the display refresh rate under representative conditions. Aim for stable 60 FPS on capable desktop devices when feasible, while recognizing that hardware, browser, image decoding, and device refresh rate affect achievable performance.

For lower-powered devices, prioritize consistent, responsive motion over an arbitrary FPS number.

Verify:

- No obvious stutter during normal scrolling.
- No visible blank frames or flicker.
- No large background jumps.
- Correct reverse animation.
- Stable behavior during viewport resizing.
- Responsive navbar clicks while the animation runs.
- Reasonable CPU and memory usage.
- A useful static fallback when motion is reduced or assets are unavailable.

Do not claim that the issue is fixed merely because the code uses `requestAnimationFrame`. Confirm the result through actual browser testing.

---

## 7. Increase text sizes thoughtfully across the website

Text is too small in several places, making the website harder for visitors to read.

Review the typography throughout the existing website and increase the sizes of genuinely undersized text without disrupting the visual hierarchy.

### Areas to inspect

- Navbar labels.
- Hero supporting copy.
- Section headings.
- Body paragraphs.
- Card descriptions.
- Feature titles.
- Calls to action.
- Button labels.
- Form labels and input text.
- Placeholder text.
- Helper text and instructions.
- Trust and privacy descriptions.
- Footer links.
- Small informational labels and badges.
- Visitor-facing content and profile-related interfaces.

Do not indiscriminately enlarge every text element.

### Suggested starting sizes

These are guidelines, not fixed mandates. Inspect the current CSS and adjust according to actual content density and viewport size.

- Standard body text: target approximately 16–18px on desktop.
- Supporting descriptions: generally 15–17px where practical.
- Form labels and button text: approximately 15–16px.
- Navbar labels: approximately 14–16px, with comfortable line height.
- Small helper text: preferably 14px or larger where feasible.
- Section headings: scale responsively according to hierarchy.
- Hero heading: preserve its existing design character while ensuring it scales appropriately on mobile.

Avoid increasing metadata, badges, or dense table text to the same size as body text if that harms hierarchy or layout.

### Implementation rules

- Reuse existing typography tokens.
- Use fluid type scaling where appropriate.
- Maintain readable line heights.
- Keep text widths reasonable.
- Avoid overflow, clipped labels, and unexpected wrapping.
- Preserve the existing font family and weights.
- Do not replace the current typography system.
- Do not reduce other text sizes merely to make room for larger text elsewhere.

Test the result at actual desktop and mobile viewport sizes.

---

## 8. Fix transparency and blur readability problems selectively

Some text becomes difficult to read when it sits over transparent or blurred components and the animated background moves behind it.

This must be investigated carefully, because the problem does not affect every transparent component.

The solution is not to remove all glass effects or give every card an opaque background.

### Step A — Identify the actual problem areas

Inspect the running website while the background is moving.

Review each affected component at multiple animation frames and scroll positions.

Identify the specific combination of:

- Text color.
- Background image brightness and color.
- Surface transparency.
- Backdrop blur.
- Border contrast.
- Text size and weight.
- Localized visual detail behind the text.

Determine whether readability is failing because of insufficient text contrast, a moving high-detail image, excessive transparency, or an inappropriate combination of these factors.

Create a list of the affected components and their causes.

### Step B — Fix each component according to its needs

Choose the smallest effective correction for each affected component.

Possible adjustments include:

**Option 1: Improve text color**

If the surface is already suitable but the text lacks contrast, use a stronger existing navy or deep blue-grey text color.

For text over genuinely dark glass, use an appropriate light text color instead.

**Option 2: Slightly increase the surface opacity**

If the animated background is too visually dominant behind the text, increase the existing surface opacity modestly.

Preserve the glass effect and the visible background.

Do not automatically make the entire component opaque.

**Option 3: Strengthen the existing backdrop blur**

If fine details in the animated background interfere with reading, modestly adjust the existing blur on that specific surface.

Avoid excessive blur or expensive animated filters across large areas.

**Option 4: Introduce a subtle local tint**

If necessary, use a restrained navy-tinted or warm-ivory-tinted translucent surface that harmonizes with the blue luxury theme.

Do not apply a blue overlay to the whole background.

Do not replace a white or transparent surface everywhere with a dark blue fill.

**Option 5: Improve typography locally**

If a text element is still difficult to read, adjust its color, weight, size, or line height modestly, provided the existing visual hierarchy is preserved.

### Step C — Respect the intended visual hierarchy

The background should remain visible through the glass components.

The content should remain readable regardless of which frame appears behind it.

Do not make every component more opaque just because a few components have poor contrast.

Do not modify transparent components that already work well.

Do not change the underlying artwork or use a global image filter to compensate for local contrast problems.

Do not add large opaque text panels unless the specific content genuinely requires one.

### Step D — Validate contrast

Evaluate representative text and background combinations using WCAG contrast guidance.

As a general target:

- Normal text should achieve a contrast ratio of at least 4.5:1.
- Large text should achieve at least 3:1.
- Functional controls and important visual indicators should have adequate contrast.

Because the background is animated, checking only one screenshot is insufficient.

Inspect representative bright, dark, and high-detail frames. A translucent surface may look readable over one frame and become unreadable over another.

Use a stable surface tint or stronger text treatment where needed so readability does not depend on the background being at a particular animation frame.

Prioritize normal body text, navigation labels, form content, and primary actions.

---

## 9. Preserve responsive and multilingual behavior

The fixes must work across desktop, tablet, and mobile.

Test:

- Wide desktop screens.
- Standard laptop widths.
- Tablet widths.
- Narrow mobile screens.
- Browser zoom and increased text sizes where feasible.

For English:
- Preserve left-to-right layout.
- Keep desktop navigation items on one line.

For Urdu:
- Preserve right-to-left layout.
- Ensure the larger navbar spacing and typography do not break alignment.
- Keep navigation labels readable and prevent unintended wrapping.
- Preserve correct directionality of icons and controls.

If the complete navigation cannot fit on mobile, use the existing responsive menu or a suitable compact navigation pattern rather than forcing desktop navigation into the viewport.

Do not change the website's existing language behavior.

---

## 10. Testing and acceptance criteria

Do not stop after making CSS changes.

Run the existing application and verify the following in the browser.

### Navbar
- [ ] The navbar has more comfortable vertical spacing.
- [ ] Text is vertically centered.
- [ ] Desktop navigation labels remain on one line.
- [ ] No horizontal overflow is introduced.
- [ ] The navbar maintains its blue luxury glass appearance.
- [ ] Every visible navigation item has the correct working action.
- [ ] Background layers do not intercept clicks.
- [ ] Mobile navigation works.
- [ ] The navbar remains readable in its initial and scrolled states.

### Background animation
- [ ] The cause of the choppy animation has been identified.
- [ ] The implementation has been optimized based on the actual bottleneck.
- [ ] Scrolling downward and upward behaves correctly.
- [ ] Rapid scrolling does not cause obvious stutter or blank frames.
- [ ] Resizing the viewport does not break the animation.
- [ ] The background remains visually unchanged.
- [ ] Performance claims are based on actual testing.

### Typography
- [ ] Undersized customer-facing text has been improved.
- [ ] Body text is comfortable to read.
- [ ] Form labels and controls are legible.
- [ ] The visual hierarchy remains consistent.
- [ ] No important text is clipped or unexpectedly wrapped.

### Glass readability
- [ ] Affected transparent components have been identified.
- [ ] Their contrast is improved using component-specific corrections.
- [ ] Working transparent and white surfaces remain unchanged.
- [ ] Readability holds across representative background frames.
- [ ] The page retains its glassmorphism aesthetic.

### Regression checks
- [ ] Existing routes work.
- [ ] Existing forms and authentication entry points still work.
- [ ] English and Urdu layouts remain functional.
- [ ] No new console errors have been introduced.
- [ ] Existing layout and animation behavior outside the requested fixes remain intact.

Run the project's existing build, lint, type-check, and relevant automated tests.

If browser automation is available, test actual click behavior and inspect the live animation rather than relying only on source code or screenshots.

---

## 11. Required final report

After implementation, provide:

1. The root cause of the animation stutter.
2. The exact changes made to the animation rendering or scroll processing.
3. The navbar spacing and wrapping changes.
4. Which navbar links were tested and their destinations.
5. Which typography tokens or components were adjusted.
6. Which specific glass components had readability issues and how each was corrected.
7. The files changed.
8. Build and test results.
9. Actual performance measurements where available.
10. Any unresolved defects.

Clearly distinguish verified fixes from assumptions or remaining limitations.

## Final instruction

Work directly in the existing Gulistan project.

Prioritize the animation bottleneck, navbar click behavior, single-line navigation, comfortable text sizing, and selective readability corrections.

**Preserve the existing blue luxury theme, architectural background, layout, typography family, component shapes, glass effects, and functionality wherever they are not directly implicated in these problems.**

Diagnose first, make focused changes, test in the real browser, and refine until the experience is smooth, readable, responsive, and professional.

Do not merely explain what should be changed. Implement the changes and verify them.
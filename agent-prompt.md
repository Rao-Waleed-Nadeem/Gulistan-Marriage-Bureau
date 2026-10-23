# ANTIGRAVITY MASTER IMPLEMENTATION PROMPT
## Gulistan Marriage Bureau — Cinematic Background, Premium Glass UI, Smooth Scroll Motion & Complete Design-System Upgrade

### 1. Your mission

You are responsible for upgrading the existing Gulistan Marriage Bureau website into a polished, premium, cinematic, responsive web experience.

The current background artwork is correct and must be preserved. The problem is that the background does not feel smooth during scrolling, the navigation does not have the desired floating capsule appearance, many components lack meaningful animations, and white or solid-colored blocks interrupt the visual experience.

Your task is to improve the existing application itself, not simply produce a design concept, mockup, or isolated landing page.

The result must feel like a sophisticated architectural garden: warm sandstone arches, dusty blue-grey foliage, deep teal shadows, soft ivory light, subtle antique gold details, floating glass surfaces, and restrained cinematic motion.

**Primary design objective:** Make the existing animated architectural background and the interface feel like one cohesive, carefully art-directed experience.

**Implementation objective:** Inspect the existing repository, understand its framework and components, identify the source of the background animation, and make production-quality changes without breaking existing functionality.

Do not stop after analysis. Once the repository and assets have been inspected, implement, run, test, and refine the changes.

---

### 2. Assign explicit agent responsibilities

Use specialized agents if the Antigravity environment supports parallel agents. If it does not, execute the same responsibilities sequentially as distinct workstreams.

Do not let multiple agents independently rewrite the same files. Establish clear ownership and integrate changes through one lead agent.

#### Agent A — Lead architect and integration owner

Responsibilities:
- Inspect the repository, existing application architecture, routes, components, styling system, animation libraries, and package scripts.
- Identify the actual background animation implementation and all available assets.
- Establish the implementation plan and identify files that must change.
- Preserve existing business functionality and the current visual identity.
- Define shared design tokens and component contracts before implementation.
- Coordinate work from the other agents.
- Resolve integration conflicts and own the final build.

Deliverables:
- Repository audit.
- Implementation plan.
- List of modified files and reasons.
- Integrated, working application.
- Final verification report.

#### Agent B — UI/UX and design-system specialist

Responsibilities:
- Analyze the supplied screenshot and all 300 frames in `Gulistan_frames_30fps_high_quality.zip`.
- Extract representative colors, observe how the artwork changes over time, and determine where text and controls remain readable.
- Define the color palette, typography, spacing, radii, borders, glass surfaces, shadows, and interaction states.
- Design a floating, translucent capsule navigation.
- Replace inappropriate opaque white blocks with carefully calibrated glass surfaces.
- Establish reusable visual patterns for buttons, cards, forms, badges, dropdowns, dialogs, and section containers.
- Maintain accessibility, responsive behavior, and the existing brand identity.

Deliverables:
- Design tokens.
- Component styling specifications.
- Before/after comparison.
- Responsive design validation.

#### Agent C — Frontend and interaction engineer

Responsibilities:
- Implement the approved visual system in the existing framework.
- Refactor shared components instead of adding duplicated CSS for individual pages.
- Ensure the navigation, buttons, cards, forms, menus, dialogs, and section transitions are functional.
- Preserve existing routes, links, authentication entry points, and business logic.
- Implement responsive layouts for desktop, tablet, and Android mobile screens.
- Support keyboard navigation, visible focus, touch interactions, and reduced-motion preferences.

Deliverables:
- Working reusable components.
- Updated pages and layouts.
- Functional interaction states.
- Successful build and lint checks where supported.

#### Agent D — Motion and background-rendering specialist

Responsibilities:
- Investigate why the current background looks jerky or discontinuous while scrolling.
- Inspect the supplied frame sequence and its intended timing, order, resolution, and visual continuity.
- Implement smooth background playback or scroll-linked animation according to the actual desired behavior and existing asset characteristics.
- Coordinate background position, scaling, parallax, section transitions, and navbar state.
- Ensure animation does not cause layout shifts, flickering, excessive repaints, or input lag.
- Provide a performant fallback for mobile devices and users who prefer reduced motion.

Deliverables:
- Smooth background animation.
- Defined motion system.
- Performance measurements and fallback behavior.

#### Agent E — QA, accessibility, and security reviewer

Responsibilities:
- Independently test the result against the acceptance criteria in this prompt.
- Review desktop, tablet, and mobile layouts.
- Test scrolling in both directions, rapid scrolling, navigation transitions, menus, forms, and interactive controls.
- Identify overflow, flickering, contrast problems, broken links, console errors, and regressions.
- Check reduced-motion support, keyboard accessibility, focus states, and touch-target sizes.
- Confirm that the visual redesign does not weaken existing authentication or privacy protections.

Deliverables:
- Reproducible test results.
- Prioritized defect list.
- Regression report.
- Final acceptance recommendation.

**Governance rule:** The lead agent integrates the implementation, but the QA/security agent must independently verify the result. Do not mark a task complete solely because the implementing agent says it is complete.

---

### 3. Mandatory repository and asset audit

Before changing code:

1. Inspect the repository structure and determine the actual framework, routing approach, CSS architecture, component library, and existing animation dependencies.
2. Locate the current homepage, navigation, background rendering component, section layouts, and any global styling files.
3. Inspect `Gulistan_frames_30fps_high_quality.zip`. It contains 300 sequential JPEG frames. Confirm frame dimensions, file order, frame rate assumptions, and visual continuity rather than assuming how the sequence was generated.
4. Compare the supplied screenshot with representative frames from the beginning, middle, and end of the sequence.
5. Determine whether the existing implementation uses a video, a frame sequence, a static image, CSS background positioning, or another animation technique.
6. Inspect all routes and reusable components that contribute to the visible website.
7. Run the existing application and record any pre-existing errors before making changes.
8. Check the installed dependencies before introducing new libraries.
9. Create a recoverable checkpoint or Git commit if repository permissions and Git are available.

Do not replace the existing architecture simply because another framework is familiar to you.

Do not recreate the background artwork with generic gradients, substitute stock imagery, or generate an unrelated new background.

Use the supplied artwork as the authoritative visual reference.

---

### 4. Art direction and color analysis

The animation contains a consistent architectural palette:

- Warm ivory and cream in the illuminated arches and central corridor.
- Sandstone, beige, and champagne tones in the architectural details.
- Dusty blue-grey and muted sage in the rounded foliage.
- Deep blue-teal and charcoal-blue in the shadows and darker foliage.
- Restrained antique gold in selected architectural accents.

Use the following as starting tokens, then refine them using sampled colors from the actual frame sequence.

```css
:root {
  --gulistan-teal-950: #18383F;
  --gulistan-teal-900: #20464D;
  --gulistan-teal-800: #2C5662;

  --gulistan-blue-700: #486878;
  --gulistan-blue-500: #738D99;
  --gulistan-sage-300: #B6C7C5;

  --gulistan-ivory-50: #FBF7F0;
  --gulistan-ivory-100: #F5E8D8;
  --gulistan-sandstone-200: #E8D8C8;
  --gulistan-sandstone-400: #C8A888;

  --gulistan-gold-500: #B69A62;
  --gulistan-ink-900: #243238;

  --glass-white: rgba(255, 252, 246, 0.16);
  --glass-white-strong: rgba(255, 252, 246, 0.26);
  --glass-dark: rgba(19, 48, 55, 0.30);

  --glass-border-light: rgba(255, 255, 255, 0.38);
  --glass-border-dark: rgba(30, 59, 65, 0.20);
}
```

These are design starting points, not an instruction to force every component into these exact values.

Sample the frames and refine the tokens where necessary.

Rules:
- Use antique gold sparingly for decorative accents, tiny markers, and highlights.
- Use deep teal for primary actions and important text on light surfaces.
- Use warm ivory for readable content surfaces and text over dark glass.
- Use dusty blue and sage for secondary surfaces and decorative states.
- Avoid introducing saturated purple, neon cyan, electric blue, or unrelated accent colors.
- Avoid excessive gradients, strong glow effects, and large gold borders.
- Maintain adequate text contrast against every animated background state.

The background must remain the visual centerpiece. UI colors should be derived from it, not compete with it.

---

### 5. Implement the capsule navigation

The navbar is one of the highest-priority changes.

Replace the current visually heavy, solid navigation treatment with a refined floating capsule or pill-shaped navigation.

#### Visual requirements

- The navigation should feel suspended above the animated background.
- Use a transparent or translucent surface with a subtle backdrop blur.
- Do not give the navbar a permanent opaque teal, white, or cream fill.
- Use a delicate border, soft shadow, and restrained depth.
- Use generous horizontal padding and a balanced height.
- Apply fully rounded outer corners.
- Maintain the existing Gulistan wordmark and brand symbol.
- Keep the logo legible against changing background colors.
- Use clear, elegant navigation labels with appropriate spacing.
- The active navigation item should have a refined underline, thin gold marker, or subtle glass highlight.
- Primary and secondary actions should remain distinguishable.

Suggested starting CSS:

```css
.nav-capsule {
  background: rgba(245, 232, 216, 0.12);
  border: 1px solid rgba(255, 255, 255, 0.34);
  backdrop-filter: blur(22px) saturate(135%);
  -webkit-backdrop-filter: blur(22px) saturate(135%);
  border-radius: 999px;
  box-shadow:
    0 8px 32px rgba(20, 40, 45, 0.10),
    inset 0 1px 0 rgba(255, 255, 255, 0.20);
}
```

Refine these values against the real background. A blur value alone does not guarantee a premium result; the surface, border, contrast, and underlying image must work together.

#### Scroll behavior

At the top of the page:
- Show the capsule with minimal visual weight.
- Preserve the background's visual impact.
- Keep the logo and navigation readable.

After scrolling:
- Transition smoothly to a slightly more legible glass state.
- Optionally increase blur and surface opacity a little.
- Reduce the capsule's height or vertical spacing subtly if that improves the design.
- Do not abruptly change the navbar from transparent to an opaque block.
- Avoid sudden jumps, flickering, and layout shifts.

Implementation requirements:
- Use the existing navigation architecture.
- Keep the navbar fixed or sticky only if appropriate for the current layout.
- Do not add unnecessary duplicate navigation bars.
- Ensure anchor links and route changes work correctly.
- Prevent anchor targets from being obscured by the sticky navigation.
- Provide a properly designed mobile navigation capsule or compact responsive variant.
- Keep menu interactions accessible to keyboard and touch users.

---

### 6. Repair background smoothness during scrolling

The existing background is visually correct. Preserve it.

The background must feel continuous while the user scrolls down and up, including during rapid scroll gestures.

First diagnose the actual problem. Do not apply arbitrary CSS transforms without understanding the source of the discontinuity.

#### If the background uses a sequence of 300 frames

- Preserve the supplied frames and their correct chronological order.
- Build a dedicated background-rendering component instead of placing hundreds of independent image elements in the DOM.
- Preload a sensible initial subset of frames and progressively load additional frames.
- Decode frames before displaying them where feasible.
- Avoid waiting for every frame before the initial page render.
- Use an appropriate rendering strategy, such as a canvas-based renderer, when justified by measured performance.
- Ensure frame transitions do not expose blank frames.
- Use requestAnimationFrame or an equivalent browser-friendly scheduling mechanism where appropriate.
- Keep scroll handlers lightweight and avoid expensive synchronous image work during scrolling.
- Use a normalized animation progress value clamped between 0 and 1.
- Map progress consistently to the correct frame index.
- Avoid repeatedly starting independent animations on every scroll event.
- Preserve a stable aspect ratio and deliberate crop.
- Avoid uncontrolled image scaling that causes the artwork to jump.
- Provide a useful poster or fallback image while frames are loading.

#### Choose the correct playback model

Determine which of these behaviors best matches the supplied animation and the current implementation:

**A. Scroll-scrubbed animation:** The background advances through the sequence as the user moves through a defined page section. Scrolling backward should move backward through the sequence. Use this when the animation is intended to be synchronized with scroll position.

**B. Continuous ambient animation:** The background plays smoothly at a controlled frame rate while the user scrolls normally. Use this when the artwork is intended to remain an ambient, continuously moving background.

**C. Hybrid animation:** The background moves subtly during normal viewing and synchronizes with scroll position through a specific cinematic section. Use this only when it improves the experience without creating conflicting motion sources.

Do not combine independent scroll and autoplay animations that compete for control of the same frame index.

If the current animation was intended to be scroll-scrubbed, prioritize deterministic scroll synchronization rather than adding a second autoplay loop.

If the current animation was intended to autoplay, do not force every section of the website to control it.

#### If the background uses a video

- Inspect whether the video is the actual source of the stuttering.
- Use the existing video if it is appropriate and visually correct.
- Avoid repeatedly seeking the video on every scroll event unless deterministic scrubbing is explicitly required and implemented correctly.
- Use a poster fallback and appropriate loading behavior.
- Account for mobile autoplay restrictions.

#### If the background is a static image with CSS movement

- Preserve the image.
- Fix oversized transforms, discontinuous background positioning, and layout-dependent movement.
- Prefer stable positioning and GPU-friendly transforms when justified.
- Avoid moving the entire page or applying filters to all content to animate the background.

#### Performance requirements

- Avoid cumulative layout shift.
- Avoid a blank or black flash during frame changes.
- Do not decode the complete sequence synchronously on the main thread.
- Avoid continuous rendering when nothing is changing.
- Pause or reduce animation when the page is hidden, where appropriate.
- Test normal scrolling, rapid scrolling, reverse scrolling, and window resizing.
- Keep the main thread responsive on ordinary Android devices.
- Implement a reduced-motion fallback.

If frame rendering remains too expensive on mobile, use a sensible lower-frame-rate playback, smaller preprocessed derivatives, or a static poster fallback. Preserve the high-quality originals and never sacrifice privacy or functionality for decorative animation.

---

### 7. Make every component part of the glass design system

The current page contains solid white components and blocks that visually disconnect the UI from the background.

Refactor these into a consistent glass component system.

#### A. Glass cards

Use translucent surfaces with:
- Subtle backdrop blur.
- Fine, low-contrast borders.
- Soft shadows.
- Consistent radii.
- Appropriate internal spacing.
- Readable content and restrained hover states.

Cards should reveal the artwork beneath them without sacrificing readability.

#### B. White sections and blocks

Do not simply reduce the opacity of every white background.

For each section, determine whether it needs:
- Transparent background.
- Light ivory glass.
- Dark teal glass.
- A nearly opaque surface for dense, text-heavy content.

Use more opaque surfaces only where readability requires them, particularly for long forms, legal information, sensitive account screens, and dense administrative content.

A translucent surface should not make a long paragraph difficult to read.

#### C. Buttons

Create a unified button system:

Primary:
- Deep teal or a carefully calibrated dark glass treatment.
- Clear text contrast.
- Refined hover and pressed states.
- Obvious action hierarchy.

Secondary:
- Transparent or ivory glass.
- Delicate border.
- Consistent text contrast.

Tertiary:
- Text or icon action with a clear accessible interaction area.

Include:
- Default, hover, focus, active, disabled, loading, and success/error states where appropriate.
- Smooth transitions.
- Keyboard accessibility.
- Touch targets appropriate for mobile.

Do not make every button glow, scale dramatically, or animate continuously.

#### D. Forms and inputs

- Use translucent input surfaces where the background remains calm enough.
- Provide stable, readable input text and placeholders.
- Use clear labels rather than relying on placeholders alone.
- Maintain visible borders and focus rings.
- Keep error and success messages readable.
- Avoid excessive transparency inside long or complex forms.
- Preserve all existing form validation and submission behavior.

#### E. Menus, dropdowns, dialogs, and popovers

- Use the same surface tokens and radii as the rest of the interface.
- Add a refined entrance and exit transition.
- Provide a backdrop when required.
- Ensure focus handling and dismissal work correctly.
- Keep content legible even when the background is visually busy.

#### F. Badges and status indicators

- Use muted sage, teal, ivory, and restrained gold.
- Do not rely on color alone for status.
- Use consistent visual treatment for active, pending, successful, warning, and error states.
- Avoid oversized, attention-grabbing status pills unless they communicate genuinely important information.

#### G. Footer and secondary content

The footer must belong to the same visual language.

Avoid an abrupt, full-width, solid-colored block that breaks the page's architectural atmosphere. Use an appropriate translucent or carefully chosen darker surface, while keeping links and legal information readable.

---

### 8. Build a complete motion system

Animations must be present across the experience, but every animation must have a purpose.

Create a centralized motion specification rather than implementing unrelated timings and effects in every component.

Suggested starting tokens:

```css
:root {
  --motion-fast: 160ms;
  --motion-standard: 240ms;
  --motion-emphasis: 380ms;

  --ease-standard: cubic-bezier(0.2, 0.7, 0.2, 1);
  --ease-emphasis: cubic-bezier(0.16, 1, 0.3, 1);

  --radius-card: 24px;
  --radius-control: 14px;
  --radius-pill: 999px;
}
```

These values are initial guidelines. Refine them after testing the actual interface.

#### Hero section

Implement:
- A refined entrance for the headline.
- A short stagger between headline, supporting text, and calls to action.
- A subtle reveal for decorative elements.
- A restrained parallax relationship between the background and foreground content, if appropriate.
- A natural transition into the next section.

Do not animate the headline on every scroll event.

#### Scroll-triggered sections

Implement appropriate reveal behavior for:
- Introductory content.
- Feature sections.
- Service descriptions.
- Trust and privacy content.
- How-it-works steps.
- Testimonials or other existing content.
- Calls to action.
- Footer content.

Use a reusable reveal component or a shared animation utility.

Requirements:
- Trigger when content enters the viewport.
- Use restrained opacity and small-distance transforms.
- Stagger related items subtly.
- Avoid large translations, exaggerated zoom, and long entrance delays.
- Prevent content from remaining invisible if an animation fails.
- Avoid repeatedly replaying entrance animations whenever the user scrolls slightly up and down.
- Respect reduced-motion preferences.

#### Cards and interactive elements

Add purposeful interactions to:
- Cards.
- Buttons.
- Navigation links.
- Dropdowns.
- Tabs.
- Accordions.
- Form sections.
- Dialogs.
- Existing interactive components.

Use subtle elevation, border, opacity, or transform changes. Make touch behavior work without depending on hover.

#### Navigation transitions

- Animate the active indicator.
- Transition the capsule's scroll state smoothly.
- Animate mobile menu opening and closing.
- Keep route and anchor navigation responsive.
- Avoid animating layout dimensions in ways that cause content jumps.

#### Loading and feedback

Where applicable, provide:
- Skeleton or placeholder states.
- Smooth progress indicators.
- Button loading feedback.
- Inline validation transitions.
- Success and error feedback.
- Empty-state transitions.

Do not add artificial loading delays.

#### Performance constraints

- Prefer opacity and transform animations when suitable.
- Avoid repeatedly animating expensive blur filters across large areas.
- Do not create a perpetual animation loop for every component.
- Avoid installing an animation library if the current stack already provides adequate functionality.
- If a library is needed, choose one that fits the current framework and keep its use focused.
- Ensure all essential content remains available without animation.

---

### 9. Typography and visual hierarchy

Create a coherent typographic system appropriate for a premium matchmaking brand.

The design should feel elegant, warm, and professional rather than ornate or overly decorative.

Use:
- A refined serif or display face for the main hero headline and selected editorial headings.
- A highly readable sans-serif for body copy, controls, navigation, and forms.
- Clear differences between page titles, section headings, descriptions, labels, and metadata.
- Comfortable line heights and consistent text widths.
- Responsive type sizes using fluid scaling where appropriate.

Use the existing fonts if they are appropriate. If introducing new fonts, prefer reliable licensing and sensible loading behavior.

Do not sacrifice readability for stylistic typography.

The main hero headline should preserve the existing message, “A more thoughtful beginning.”, unless the current product requirements specify otherwise.

Maintain the existing Gulistan name, brand symbol, and marriage-bureau positioning.

---

### 10. Hero section and page composition

The hero must remain the strongest visual moment on the homepage.

Preserve the existing architectural background and make the foreground composition feel deliberate.

Requirements:
- Place the headline in a position that remains readable as the artwork changes.
- Use a responsive maximum text width.
- Prevent the headline from colliding with arches, navigation, or other elements at smaller widths.
- Use carefully calibrated contrast support when necessary.
- Keep supporting copy concise and legible.
- Give primary and secondary actions a clear hierarchy.
- Ensure the hero works at desktop and Android mobile sizes.
- Transition into the next section without a harsh horizontal edge or abrupt color change.

If the existing lower hero panel is decorative, refine its transparency and spacing rather than making it a heavy solid block.

Do not add decorative labels, animated indicators, or interface elements that do not serve a real purpose.

---

### 11. Apply the design system consistently to all existing pages

Do not limit the implementation to the first viewport.

Audit all existing routes and reusable components, including:
- Homepage.
- Our Approach.
- How It Works.
- Privacy & Trust.
- Contact Us.
- Sign In.
- Register Profile.
- Existing dashboard or authenticated views, if present.

Preserve all current content and functionality unless a specific change is necessary and justified.

Every page should share:
- The same design tokens.
- The same navigation language.
- Consistent glass surfaces.
- Consistent button styles.
- A shared spacing and radius scale.
- Appropriate motion patterns.
- Responsive behavior.

Dense forms and privacy-related content may use more opaque surfaces when necessary. Consistency does not mean forcing the same transparency on every element.

Do not invent new business functionality or replace existing workflows with decorative prototypes.

---

### 12. Urdu, English, and responsive behavior

The website must remain responsive and compatible with its existing language controls.

For English:
- Use left-to-right layout.
- Keep conventional alignment and navigation behavior.

For Urdu:
- Support right-to-left layout correctly.
- Mirror navigation and directional elements where appropriate.
- Preserve readable Urdu typography.
- Avoid reversing non-directional icons or logos unnecessarily.
- Verify text wrapping and capsule navigation behavior.

Responsive testing must include:
- Wide desktop screens.
- Standard laptop screens.
- Tablets.
- Android mobile screens.
- Narrow mobile widths.
- Browser zoom and increased text size where feasible.

On mobile:
- Prevent horizontal overflow.
- Avoid oversized hero text.
- Ensure controls are comfortably tappable.
- Use an appropriately compact navigation pattern.
- Reduce expensive decorative motion when necessary.
- Preserve readable content even when backdrop blur is unavailable.

Do not treat a responsive desktop screenshot as proof of mobile usability.

---

### 13. Accessibility and reduced motion

Implement a global reduced-motion policy.

When the user has enabled `prefers-reduced-motion: reduce`:
- Disable or simplify nonessential parallax.
- Stop or substantially reduce decorative background motion where appropriate.
- Replace scroll-linked cinematic movement with a stable frame or restrained transition.
- Remove unnecessary entrance translations.
- Preserve functional state changes and meaningful feedback.
- Keep all content visible and all interactions functional.

Also verify:
- Keyboard navigation.
- Visible focus indicators.
- Accessible names for controls.
- Semantic headings and landmarks.
- Sufficient contrast.
- Accessible mobile menus and dialogs.
- Correct focus management.
- No interaction that depends exclusively on hover.
- No flashing or distracting animation.

Accessibility must be part of the implementation, not an optional polish step.

---

### 14. Technical quality and implementation rules

- Work within the existing project and framework.
- Preserve current routes and functional behavior.
- Reuse existing components where appropriate.
- Establish shared design tokens before styling individual sections.
- Avoid duplicated CSS and conflicting global styles.
- Avoid arbitrary z-index escalation.
- Keep navigation and background layers correctly ordered.
- Prevent pointer-event conflicts between decorative backgrounds and interactive content.
- Keep background rendering isolated from normal page layout.
- Clean up event listeners, observers, animation frames, and resources on component unmount.
- Avoid unnecessary DOM elements for decorative effects.
- Avoid adding dependencies without justification.
- Keep the console free of new errors and warnings where feasible.
- Never place secrets or privileged backend credentials in client-side code.
- Do not weaken existing authentication, access controls, privacy protections, or data validation.
- Do not expose private customer information while testing visual components.
- Use synthetic data for any account or profile screens used in the prototype.

If the existing architecture conflicts with a proposed implementation, document the conflict and choose the smallest safe change that meets the design objective.

---

### 15. Testing and performance verification

Do not declare the work finished after the first successful render.

Run the available build, lint, type-check, and automated test commands. Add or update tests where practical.

Use browser automation or the available browser tools to inspect the real running application, not only source code.

Test these scenarios:

1. Load the homepage from a fresh browser session.
2. Observe the initial background loading state.
3. Scroll slowly from top to bottom.
4. Scroll rapidly through the hero and subsequent sections.
5. Scroll backward and verify reverse behavior if the animation is scroll-scrubbed.
6. Resize the viewport during and after scrolling.
7. Navigate between sections and existing routes.
8. Open and close navigation menus and dialogs.
9. Test all primary and secondary buttons.
10. Test keyboard navigation and focus visibility.
11. Test reduced-motion mode.
12. Test English and Urdu layouts where available.
13. Inspect the mobile layout for overflow and overlapping elements.
14. Check that all content remains readable against changing frames.
15. Check that no background flash, missing frame, sticky-position jump, or layout shift occurs.
16. Check the browser console for errors.
17. Check that existing forms and authentication entry points still work.
18. Check that the redesign does not break existing privacy or access-control behavior.

#### Performance targets

Use these as verification goals rather than unverified claims:
- No visible background frame discontinuity during ordinary scrolling.
- No repeated large layout shifts.
- No unnecessary long tasks caused by scroll handlers.
- Responsive interactions during rapid scrolling.
- A stable initial render while background assets load.
- Good responsiveness on an ordinary Android device.
- Where measurable, aim for a Lighthouse Performance score of at least 90 on a representative production-like build, without sacrificing accessibility, readability, or functional correctness.

Record actual measurements and the testing environment. If a target cannot be achieved, explain the bottleneck and the next corrective action.

---

### 16. Visual review and refinement loop

After the first implementation:

1. Capture a screenshot at the same approximate viewport as the supplied reference.
2. Capture a full-page screenshot.
3. Capture a narrow mobile screenshot.
4. Compare the result against the original screenshot and sampled animation frames.
5. Inspect the capsule navigation, hero typography, glass cards, buttons, and transitions.
6. Scroll through the live page while observing the background and foreground together.
7. Identify the three most significant visual defects.
8. Correct those defects and repeat the review.
9. Check that refinements have not broken responsive behavior or accessibility.

If browser automation is available, inspect the actual running application. Do not rely solely on static screenshots to judge animation smoothness.

Do not report screenshots, measurements, or test results that were not actually produced.

---

### 17. Definition of done

The implementation is complete only when the following are satisfied or any remaining limitations are explicitly documented.

#### Background
- [ ] The supplied artwork is preserved.
- [ ] The 300-frame sequence has been inspected.
- [ ] The correct animation model has been selected.
- [ ] Background motion is smooth in both scroll directions when scroll-linked.
- [ ] No obvious frame flicker or abrupt crop changes occur.
- [ ] Mobile fallback and reduced-motion behavior work.

#### Navigation
- [ ] The navbar uses a floating capsule design.
- [ ] Its surface is transparent or translucent rather than permanently opaque.
- [ ] Blur, border, shadow, and spacing feel cohesive.
- [ ] Scroll-state transitions are smooth.
- [ ] Mobile navigation remains functional and accessible.

#### Components
- [ ] Cards and blocks follow the shared glass design system.
- [ ] White blocks have been replaced or retained intentionally based on readability.
- [ ] Buttons have consistent styles and working interaction states.
- [ ] Forms, menus, dialogs, and existing interactive elements behave correctly.
- [ ] Typography and visual hierarchy are consistent.

#### Animation
- [ ] The hero has restrained entrance motion.
- [ ] Existing content sections use consistent reveal behavior where appropriate.
- [ ] Interactive components have purposeful transitions.
- [ ] Motion is not excessive or distracting.
- [ ] Reduced-motion mode is supported.

#### UX and quality
- [ ] Desktop and mobile layouts are verified.
- [ ] English and Urdu behavior remains correct.
- [ ] Contrast and keyboard accessibility are reviewed.
- [ ] Existing routes and business functionality are preserved.
- [ ] Build, lint, and relevant tests have been run.
- [ ] Console errors and known defects are documented.
- [ ] QA has independently reviewed the implementation.

---

### 18. Required final report

When the implementation is complete, provide a concise but evidence-based report containing:

1. **Summary:** What changed and what visual problems were solved.
2. **Background diagnosis:** What caused the original scrolling or animation problem.
3. **Design system:** Final palette, glass treatment, typography, and motion principles.
4. **Files changed:** Important files and their purpose.
5. **Animation implementation:** Playback model, loading strategy, fallback, and reduced-motion behavior.
6. **Functional preservation:** Existing routes and components checked.
7. **Testing:** Exact checks performed and their results.
8. **Performance:** Actual measurements, if available.
9. **Outstanding defects:** Any incomplete items, known limitations, or recommended next steps.
10. **Visual evidence:** Actual before/after screenshots or browser recordings if the environment supports them.

Clearly distinguish completed work from planned work and measured results from estimates.

### Final instruction

Start by inspecting the existing repository and the actual 300-frame animation sequence. Then implement the improvements directly, validate the running website, and iterate until the interface feels cohesive, smooth, premium, and professional.

**Preserve the background. Improve the rendering. Float the navigation. Unify the glass components. Animate with restraint. Protect readability. Verify everything.**

Do not stop at a written plan or a decorative mockup. Deliver the working implementation.
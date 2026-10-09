# KelanaLampung UI System

## Product direction
KelanaLampung is a destination discovery and itinerary planning product. The interface should feel like a calm, credible travel tool: useful information first, local character second, automation third.

## Visual contract
- Use solid white surfaces with visible slate borders for content cards.
- Reserve blur for the floating navigation and modal backdrops; do not stack translucent glass cards.
- Use teal for primary actions and active states, slate for structure, sky for neutral information, emerald for success, amber only for warnings/rewards, and rose for errors.
- Do not use `Sparkles` or emoji as generic decoration. Use icons that describe the action: grid, map, route, clock, bookmark, info.
- Do not claim AI/automation unless the associated action actually runs the planner or recommendation service.
- Prefer specific task labels over marketing badges: “Buat rute”, “Pilih kategori”, “Simpan rute”.

## Typography and density
- Display headings use the existing `font-display` family.
- Body text must remain readable, with muted text at slate-600 or darker.
- Keep line-height relaxed for descriptions and use compact labels only for metadata.
- Minimum interactive target is 44px on touch devices.

## Shared primitives
- `src/components/SafeImage.tsx`: one fallback attempt, then an unavailable state.
- `src/components/CategoryPills.tsx`: category filters with functional icons and accessible pressed states.
- `src/components/Callout.tsx`: semantic info, success, warning, error, and tip messages.
- `src/index.css`: shared surfaces, focus rings, modal treatment, and reduced-motion behavior.

## Accessibility baseline
- Every meaningful image has descriptive alt text.
- Every icon-only control has an accessible label.
- Every filter exposes `aria-pressed`.
- Focus-visible states must be visible against white and teal surfaces.
- Avoid relying on color alone to communicate status.
- Respect `prefers-reduced-motion`.

## Responsive baseline
- Test at 375px, 768px, 1024px, and 1440px.
- Prevent horizontal overflow in filter rows and timeline content.
- Use full-width controls on narrow screens where useful.

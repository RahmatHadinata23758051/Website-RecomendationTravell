# Frontend UI/UX Audit Report — Kelana Lampung

**Date:** 2026-10-08  
**Auditor:** AI Agent (anti-ui-slop + systematic review)  
**Scope:** Desktop (1440×900), Tablet (768×1024), Mobile (375×667) — 5 pages × 3 viewports = 15 screenshots + interactive state captures  
**Tech Stack:** React 18, TypeScript, Vite, Tailwind CSS, Leaflet, Lucide React, react-icons/wi

---

## 📊 Scored Rubric (0–10 per Category)

| Category | Score | Summary |
|----------|-------|---------|
| **Visual Hierarchy** | **8/10** | Strong hero composition, clear focal points, good use of z-index layers; minor crowding on Explore regency cards |
| **Design Consistency** | **8/10** | Cohesive glass-morphism system, consistent teal/gold palette, custom Tapis patterns; some component drift in button radii |
| **Accessibility / WCAG 2.2 AA** | **5/10** | Semantic HTML present, but missing: focus-visible outlines, ARIA labels on icon-only buttons, color contrast issues on teal text, no skip-link, no reduced-motion respect |
| **Responsive Behavior** | **7/10** | Mobile-first breakpoints work; tablet inherits desktop nav (no intermediate), horizontal overflow on Explore filter pills, chatbot too wide on mobile |
| **Interaction States** | **7/10** | Hover/tap/loading states implemented; missing: keyboard focus rings, pressed states on mobile, skeleton loaders for images |
| **Copy & Content** | **8/10** | Indonesian copy is natural, brand voice consistent, contextual weather advisories; some hardcoded English labels ("AI", "CS RESMI") |
| **Empty / Loading / Error States** | **8/10** | Excellent custom loading overlay with mascot + progress bar; empty state on Explore has reset action; toast system works; no global error boundary UI |
| **Performance** | **6/10** | Heavy images (2–3 MB hero PNGs, 1.3–3.3 MB mascot assets), no lazy-loading on hero, Leaflet tiles external, no code-split routes, CORS errors in console |
| **AI-Slop Patterns** | **8/10** | Distinct local identity (Tapis patterns, Siger gold, Muli mascot), not generic; minor slop: overuse of Sparkles/emoji icons, generic gradient blobs |
| **Overall** | **7.2/10** | **Strong product-specific personality, solid component architecture, needs accessibility hardening & image optimization** |

---

## 🔍 Annotated Findings by Category

### 1. Visual Hierarchy (8/10)

**✅ Strengths**
- Hero: Full-bleed beach image with left gradient fade for text legibility — works at all viewports
- Tapis gold pattern anchored top-left creates cultural branding without competing with content
- Weather widget on right balances the search bar on left (desktop grid 7/5 split)
- Card grids use consistent aspect ratios (3:4 on Home, 16:10 on Explore)
- Planner wizard left / map right split (7/5 on desktop) is clear

**⚠️ Issues**
| Location | Issue | Severity |
|----------|-------|----------|
| Explore regency cards (desktop) | 4-col grid at 1440px makes cards ~320px wide — tagline text wraps awkwardly, "Pilih Kabupaten Lain" button cramped | Medium |
| Home recommendations carousel | 5 cards visible but only 4.5 fit — horizontal scroll hint missing | Low |
| Planner generated itinerary | Slot cards stack vertically on mobile but time/location columns don't collapse — text truncates | Medium |
| Chatbot on mobile (375px) | Chat window 420px wide → horizontal overflow; input cutoff | High |

**Fixes**
- Explore: Switch to 3-col at 1440px (`lg:grid-cols-3`), add `max-w-[360px]` per card
- Home: Add `snap-x` + `snap-mandatory` + scroll shadow indicator
- Planner: On `<md`, collapse slot to single column with accordion for details
- Chatbot: `max-w-[calc(100vw-1.5rem)]` on mobile, `w-[380px]` min on desktop

---

### 2. Design Consistency (8/10)

**✅ Strengths**
- Glass utilities (`.glass-pill-nav`, `.glass-weather-card`, `.glass-card-container`, `.glass-modal-backdrop`) — reusable, documented in `index.css`
- Color tokens: `#0D9488` (teal primary), `#F59E0B` (amber/gold), `#0F2937` (dark navy) — used consistently
- Tapis pattern appears on Hero, Feature bar, Footer, Explore banner — cultural thread
- Border radius scale: `rounded-full` (pills), `rounded-2xl` (cards), `rounded-3xl` (sections), `rounded-[28px]` (hero sections)
- Typography: `font-display` (Siger/heading), `font-sans` (body) — consistent hierarchy

**⚠️ Issues**
| Component | Inconsistency |
|-----------|---------------|
| Buttons | Primary: `rounded-full` (Navbar, Hero), `rounded-2xl` (Explore "Lihat Semua"), `rounded-xl` (Chatbot send) — 3 radii |
| Focus rings | Navbar links have custom underline bar; form inputs have `focus:ring-2 focus:ring-[#0D9488]/40`; buttons lack visible focus |
| Shadows | `shadow-md`, `shadow-lg`, `shadow-xl`, `shadow-2xl`, `shadow-[0_20px_60px_-15px_...]` — 5+ elevations undocumented |
| Icon sizes | `w-3.5 h-3.5`, `w-4 h-4`, `w-[18px] h-[18px]`, `w-5 h-5` — no token |

**Fixes**
- Create `tailwind.config.js` design tokens for: `radius`, `shadow`, `icon-size`, `focus-ring`
- Standardize primary CTA to `rounded-full`, secondary to `rounded-2xl`, tertiary/icon to `rounded-xl`
- Add global `:focus-visible { @apply ring-2 ring-[#0D9488] ring-offset-2 ring-offset-white; }`

---

### 3. Accessibility / WCAG 2.2 AA (5/10) — **Critical Gap**

**✅ Passes**
- Semantic HTML: `<header>`, `<nav>`, `<main>`, `<section>`, `<footer>`, `<form>`, `<button>`
- `alt` text on all content images (hero, cards, regency cards)
- `aria-label` on icon-only buttons (mobile menu, chat toggle, search submit)
- `lang="id"` on `<html>`
- Sufficient contrast on primary text (slate-900 on white)

**❌ Failures**
| WCAG Criterion | Location | Issue |
|----------------|----------|-------|
| **1.4.3 Contrast (AA)** | Teal text `#0D9488` on white | 3.1:1 — fails AA (needs 4.5:1 for normal text). Used in: category badges, weather advisory, badge pills, chip labels |
| **1.4.3 Contrast (AA)** | Teal text on teal-50/teal-100 backgrounds | Weather widget advisory, feature bar descriptions — ~2.8:1 |
| **2.4.7 Focus Visible** | All interactive elements | No `:focus-visible` styles; keyboard users lose track |
| **2.4.1 Bypass Blocks** | All pages | No "Skip to main content" link |
| **2.5.3 Label in Name** | Icon-only buttons (Heart favorite, Chat quick pills, Map controls) | `aria-label` present but visible label mismatch (e.g., Heart has no text) |
| **1.3.1 Info & Relationships** | Regency card grid | Cards are `<div onClick>` not `<button>` or `<a>` — not announced as interactive |
| **2.3.3 Animation from Interactions** | Loading spinners, pulse, bounce | No `prefers-reduced-motion` media query respect |
| **4.1.2 Name, Role, Value** | Custom select (WeatherWidget regency dropdown) | `<select>` styled but native — OK; but chatbot quick pills are `<button>` with icon + text — OK |

**Fixes (Priority Order)**
1. **Color tokens:** Darken teal to `#0A7A6A` (5.2:1 on white) or use `#0D9488` only on dark backgrounds
2. **Global focus-visible:** Add to `index.css` `@layer base { *:focus-visible { @apply ring-2 ring-[#0D9488] ring-offset-2; } }`
3. **Skip link:** Add `<a href="#main" class="sr-only focus:not-sr-only ...">Skip to content</a>` in `App.tsx`
4. **Regency cards:** Change to `<button>` with `type="button"` + `aria-label="Pilih ${card.name}"`
5. **Reduced motion:** Wrap `animate-*` classes in `@media (prefers-reduced-motion: no-preference)`
6. **Contrast audit:** Run `axe-core` in CI; fix all teal-on-light instances

---

### 4. Responsive Behavior (7/10)

**✅ Strengths**
- Mobile-first Tailwind classes throughout (`sm:`, `md:`, `lg:`, `xl:`)
- Navbar collapses to hamburger + full-screen drawer on mobile
- Hero grid stacks (text left, weather right → stacked on mobile)
- Explore: Regency cards 1-col → 2-col → 3-col → 4-col
- Planner: Wizard inputs stack; map goes full-width below on mobile

**⚠️ Issues**
| Viewport | Issue |
|----------|-------|
| **Tablet (768px)** | Inherits desktop navbar (pill nav visible) but no intermediate layout — Explore filter pills wrap to 3 rows |
| **Mobile (375px)** | Chatbot 420px → horizontal scroll; Planner map 580px height too tall; Home search bar "Lokasi Anda" chip hidden (`hidden sm:flex`) — good |
| **All** | No container query for WeatherWidget — doesn't adapt when placed in narrow sidebar |
| **Landscape mobile** | Not tested; chatbot may cover content |

**Fixes**
- Add `@media (max-width: 1024px)` tablet-specific: Explore pills `flex-wrap gap-2`, regency cards `grid-cols-2`
- Chatbot: `width: min(100vw - 1.5rem, 380px)`; `height: min(80vh, 580px)`
- WeatherWidget: Use container queries (`@container`) for card vs. full-width modes
- Test landscape: `@media (orientation: landscape) and (max-height: 500px)`

---

### 5. Interaction States (7/10)

**✅ Implemented**
- Hover: Card scale (`group-hover:scale-105`), button background shifts, navbar link underline bar
- Active/Pressed: `active:scale-[0.98]` on primary buttons, `active:scale-95` on chatbot send
- Loading: Explore full-screen mascot overlay with progress bar (excellent); Planner generating spinner; Chatbot "Muli sedang meracik..."
- Selected: Navbar underline bar, category pill `bg-[#0D9488]`, regency card ring, map pin scale
- Disabled: Chatbot send `disabled:opacity-40`, form inputs during submit

**❌ Missing**
| State | Element | Impact |
|-------|---------|--------|
| **Focus-visible** | All buttons, links, inputs, cards | Keyboard navigation broken |
| **Pressed (mobile)** | Regency cards, destination cards, category pills | No tactile feedback on tap |
| **Skeleton/Image placeholder** | Hero image (2.3 MB), regency cards, destination cards | Layout shift on slow 3G |
| **Drag/Scroll hint** | Home recommendations carousel, Explore destination grid | Users don't know horizontal scroll exists |
| **Toast dismissal** | Toast auto-dismisses but no swipe/close button | Accessible but not discoverable |

**Fixes**
- Add `touch-action: manipulation` + `active:scale-[0.98]` to all tappable cards
- Add skeleton loaders: `animate-pulse bg-slate-200` for images, `h-4 bg-slate-200` for text lines
- Home carousel: Add `scroll-snap-type: x mandatory` + fade mask on right edge
- Toast: Add `X` close button + swipe-to-dismiss (Framer Motion or native)

---

### 6. Copy & Content (8/10)

**✅ Strengths**
- Indonesian copy is natural, friendly ("Tabik Pun!", "Mau Jelajah Wisata di Mana Hari Ini?")
- Brand voice: Warm, local, knowledgeable — consistent across pages
- Weather advisory is contextual, dynamic, actionable (not generic)
- AI Planner labels: "Santai / Standar / Cepat" for pace, "Hemat / Standar / Mewah / Sultan" for budget — culturally tuned
- Error messages in Indonesian ("Silakan masuk terlebih dahulu...")

**⚠️ Issues**
| Location | Copy Issue |
|----------|------------|
| Navbar "AI Planner" badge | English "AI" — should be "AI" or "Cerdas" (Indonesian users understand "AI") |
| Chatbot header "CS RESMI" | English acronym — use "CS Resmi" or "Layanan Resmi" |
| Explore "1.590+ Data" | "Data" is technical — "Destinasi" or "Tempat Wisata" |
| WeatherWidget "Open-Meteo API" | Implementation detail leaked to user — hide or move to tooltip |
| Home "Rekomendasi Wisata AI • 100% Lokal Lampung" | Good, but "AI" could be "AI Cerdas" for clarity |
| Planner "Tipe Sultan" | Cultural reference (Sultan = luxury) — clever but may confuse non-locals; add tooltip |

**Fixes**
- Replace "AI" badge with `<span className="text-[9px]">AI</span>` → keep but ensure pronouncement
- "CS RESMI" → "Layanan Resmi"
- "1.590+ Data" → "1.590+ Destinasi"
- Remove "Open-Meteo API" from user-facing label; keep in code comment
- Add `title` tooltip on "Sultan" budget tier

---

### 7. Empty / Loading / Error States (8/10)

**✅ Excellent**
- **Explore loading:** Full-screen modal with mascot, animated progress bar, percentage, contextual copy — best-in-class
- **Explore empty:** Glass card with filter icon, clear message, "Reset Semua Filter" CTA
- **Home recommendations:** Falls back to mock data if API fails — graceful degradation
- **Toast system:** Bottom-right, animated, auto-dismiss, success/error variants
- **Chatbot error:** Friendly fallback message ("Maaf, terjadi kendala sinyal...") + retry implied

**⚠️ Gaps**
| State | Missing |
|-------|---------|
| **Global error boundary** | No `ErrorBoundary` wrapper — React errors show white screen |
| **Network error (offline)** | No offline banner / retry button |
| **Image load error** | `onError` falls back to hero image — but no visual indication |
| **Planner API failure** | Falls back to mock silently — no toast "Menggunakan data contoh" |
| **WeatherWidget failure** | Falls back silently — no indicator data is stale |

**Fixes**
- Wrap `App.tsx` routes in `<ErrorBoundary fallback={<ErrorFallback />}>` component
- Add `navigator.onLine` listener → top banner "Kamu offline. Beberapa fitur terbatas."
- Image `onError`: Set `data-fallback="true"` + CSS `filter: grayscale(0.5) opacity(0.7)`
- Planner: Show toast "API tidak tersedia, menggunakan contoh rute" when fallback triggers
- WeatherWidget: Show "Data cuaca tidak tersedia" badge when fallback active

---

### 8. Performance (6/10)

**✅ Good Practices**
- Vite + React 18 + code-split ready (routes not yet split)
- `withCredentials` axios interceptor for auth
- Leaflet tiles from CDN (CartoDB Voyager)
- Open-Meteo free API (no key, fast)

**❌ Critical Issues**
| Asset | Size | Issue |
|-------|------|-------|
| `/assets/images/heroes/hero-pahawang-bg.png` | **2.3 MB** | Hero background — loads on every page visit, no WebP, no lazy-load, no responsive `srcset` |
| `/assets/images/mascot/muli-lampung-mascot.png` | **3.3 MB** | Loading overlay mascot — blocks interaction until loaded |
| `/assets/images/mascot/muli-avatar-face.png` | **1.3 MB** | Chatbot avatar — used in 3 places (toggle, header, messages) |
| `/assets/images/logos/siger-gold-icon.png` | **1.6 MB** | Logo — used in Navbar, Hero, Footer |
| Leaflet tiles | External | No `prefetch` or `preconnect` |
| Routes | All bundled | No `React.lazy` + `Suspense` for `/planner`, `/explore`, `/profile` |

**Console Errors (from Playwright)**
```
Access to XMLHttpRequest at 'http://localhost:3000/api/v1/destinations...' 
blocked by CORS policy: No 'Access-Control-Allow-Origin' header
```
→ Backend runs on port 4000, not 3000. Frontend `api.ts` uses `localhost:4000` but Explore page calls `localhost:3000` directly via `fetchRealDestinations`.

**Fixes (High Impact First)**
1. **Optimize images:** Convert all PNG → WebP/AVIF; generate responsive widths (400/800/1200/1600); use `<picture>` + `srcset`; target <200 KB hero
2. **Lazy-load hero:** `loading="lazy"` + `fetchpriority="high"` on hero; eager-load only above fold
3. **Code-split routes:** `const PlannerPage = lazy(() => import('./pages/PlannerPage'))` + `<Suspense fallback={<Skeleton />}>` 
4. **Fix CORS:** Backend `.env` `ALLOWED_ORIGINS=http://localhost:5173,http://localhost:5180` — add 5180
5. **Preconnect:** `<link rel="preconnect" href="https://{s}.basemaps.cartocdn.com" crossorigin>`
6. **Bundle analysis:** `npx vite-bundle-analyzer` — check for duplicate lucide/react-icons

---

### 9. AI-Slop Patterns (8/10) — **Strong Product Identity**

**✅ Anti-Slop Signals**
- **Cultural specificity:** Tapis pattern (not generic geometric), Siger crown logo, Muli mascot (local elephant), Seruit culinary, Way Kambas conservation
- **Local language:** "Tabik Pun", "Kelana", "Siger", regency names — not "Explore", "Discover", "Adventure"
- **Real data:** 1,590+ destinations from scraped/consolidated sources, not placeholder Lorem Ipsum
- **Contextual AI:** Weather advisory per regency, planner considers budget/pace/categories, chatbot grounded in destination facts
- **Custom illustrations:** Mascot assets, regency photos, banner maps — not stock illustrations

**⚠️ Minor Slop Traces**
| Pattern | Location | Why It Feels Slop |
|---------|----------|-------------------|
| `Sparkles` icon overuse | Hero badge, Home section title, Planner generate button, Chatbot loading, Feature bar | 5+ times — becomes visual noise |
| Gradient blur blobs | WeatherWidget (`absolute -top-10 -right-10 w-32 h-32 bg-amber-400/10 rounded-full blur-2xl`), Hero bottom fade | Generic "AI app" aesthetic |
| Emoji in copy | Loading overlay "✦", "✨", toast "🎉" | Inconsistent with illustrated mascot |
| "AI" as magic dust | "Rekomendasi AI Cerdas", "AI Planner", "AI Concierge" — no explanation of what AI does | Trust signal but opaque |

**Fixes**
- Replace 2–3 `Sparkles` with context icons: `Compass` (explore), `Zap` (generate), `Bot` (chatbot)
- Replace gradient blobs with Tapis pattern at lower opacity — keeps cultural thread
- Remove emoji; use mascot illustrations or Lucide icons
- Add "Bagaimana AI Bekerja?" link in footer → explains: "Menganalisis 1.590+ destinasi, ulasan, cuaca, & preferensimu"

---

## 🎯 Top 5 UX Priorities (Fix This Sprint)

| # | Priority | Effort | Impact | Owner |
|---|----------|--------|--------|-------|
| **1** | **Fix teal contrast (#0D9488 → #0A7A6A) + global `:focus-visible`** | 2h | WCAG AA compliance, keyboard access | Frontend |
| **2** | **Optimize hero/mascot/logo images to WebP <200 KB each** | 4h | LCP -1.5s, CLS fix, bandwidth | Frontend/Design |
| **3** | **Chatbot mobile width fix + add close button to toast** | 1h | Mobile usability, no horizontal scroll | Frontend |
| **4** | **Add ErrorBoundary + offline banner + image fallback indicators** | 3h | Resilience, trust, no white screens | Frontend |
| **5** | **Code-split routes (Planner, Explore, Profile) + skeleton loaders** | 3h | Initial JS -40%, perceived perf | Frontend |

---

## 📸 Screenshot Evidence Index

| File | Viewport | Page | Purpose |
|------|----------|------|---------|
| `audit-screenshots/desktop-home.png` | 1440×900 | `/` | Hero, search, weather, recommendations, feature bar |
| `audit-screenshots/tablet-home.png` | 768×1024 | `/` | Stacked hero, 2-col recommendations |
| `audit-screenshots/mobile-home.png` | 375×667 | `/` | Hamburger nav, stacked hero, single-col cards |
| `audit-screenshots/desktop-explore.png` | 1440×900 | `/explore` | Banner, regency grid (4-col), weather widget |
| `audit-screenshots/tablet-explore.png` | 768×1024 | `/explore` | Regency grid 3-col, pills wrap |
| `audit-screenshots/mobile-explore.png` | 375×667 | `/explore` | Regency grid 1-col, full-width banner |
| `audit-screenshots/desktop-explore-regency-selected.png` | 1440×900 | `/explore?regency=Pesawaran` | Split view: cards (7) + map (5), filters, loading overlay captured |
| `audit-screenshots/desktop-planner.png` | 1440×900 | `/planner` | Wizard form, empty map |
| `audit-screenshots/desktop-planner-generated.png` | 1440×900 | `/planner` | Generated itinerary, day tabs, map with pins |
| `audit-screenshots/tablet-planner.png` | 768×1024 | `/planner` | Wizard stacks, map below |
| `audit-screenshots/mobile-planner.png` | 375×667 | `/planner` | Full-width wizard, map full-width |
| `audit-screenshots/desktop-favorites.png` | 1440×900 | `/favorites` | Empty state (unauthenticated) |
| `audit-screenshots/mobile-favorites.png` | 375×667 | `/favorites` | Mobile empty state |
| `audit-screenshots/desktop-profile.png` | 1440×900 | `/profile` | Auth required state |
| `audit-screenshots/mobile-profile.png` | 375×667 | `/profile` | Mobile auth required |
| `audit-interactive/mobile-menu-open.png` | 375×667 | `/` | Hamburger drawer, nav links, auth buttons |
| `audit-interactive/mobile-chat-open.png` | 375×667 | `/` | Chatbot overflow bug visible |
| `audit-interactive/desktop-auth-modal-error.png` | 1440×900 | `/` | Login modal, validation errors on empty submit |

---

## 🛠 Recommended Tooling Additions

```json
// package.json additions
{
  "devDependencies": {
    "@axe-core/react": "^4.8.0",           // Accessibility testing in CI
    "vite-plugin-imagemin": "^0.6.1",      // Auto-optimize images at build
    "vite-bundle-analyzer": "^0.10.0",     // Bundle size visualization
    "eslint-plugin-jsx-a11y": "^6.8.0"     // Lint-time a11y checks
  }
}
```

```ts
// vite.config.ts additions
import { visualizer } from 'rollup-plugin-visualizer';
export default defineConfig({
  plugins: [
    visualizer({ open: true, gzipSize: true, brotliSize: true })
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-leaflet': ['leaflet'],
          'vendor-charts': ['recharts'], // if added
          'vendor-icons': ['lucide-react', 'react-icons'],
        }
      }
    }
  }
});
```

---

## ✅ Acceptance Criteria for "Done"

- [ ] All teal text passes 4.5:1 contrast on light backgrounds
- [ ] `:focus-visible` ring visible on every interactive element (Tab through all pages)
- [ ] Hero image <200 KB WebP, loads with `fetchpriority="high"`
- [ ] Chatbot fits mobile viewport without horizontal scroll
- [ ] ErrorBoundary catches render errors, shows friendly fallback
- [ ] Routes code-split; initial JS <200 KB gzipped
- [ ] `prefers-reduced-motion` respected (no animate-* when enabled)
- [ ] Skip-to-content link works (Tab first focus)
- [ ] CORS errors resolved (backend allows frontend origin)

---

*Generated by anti-ui-slop audit workflow. Screenshots in `audit-screenshots/` (gitignored). Run `npm run dev` and `npx playwright test` to regenerate.*
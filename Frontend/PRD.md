# FRONTEND PRODUCT REQUIREMENTS DOCUMENT (PRD) & DESIGN BLUEPRINT
## Platform: KelanaLampung (Kelana Lampung) - AI-Powered Tourism Web Application

---

## 1. Executive Summary & Brand Identity

* **Brand Name**: **KelanaLampung** (Kelana Lampung)
* **Tagline**: *"Jelajah Surga Pariwisata Lampung Berbasis AI yang Personal & Akurat"*
* **Logo Concept**: Mahkota Siger Lampung berwarna **Siger Gold** (`#F59E0B`) dipadukan dengan tipografi modern beraksen **Ocean Teal** (`#0D9488`).
* **Design Philosophy**: *Ultra-Clean White Aesthetic, High Whitespace Contrast, Glassmorphism Micro-Interactions, and Authentic Lampung Culture*.
* **Code & Content Policy**: *Enterprise Standard Compliance. Zero AI Slop. No emojis in committed codebase, logs, or UI microcopy.*

---

## 2. Anti-AI Slop Rules & Engineering Quality Safeguards

### 2.1. Strict Anti-Slop Directives

1. **BAN ON EMOJIS (CRITICAL)**: Absolutely NO emojis in UI microcopy, component text, alt tags, comments, or logs. All visual indicators MUST use official `Lucide-React` or `Heroicons v2` vector SVG primitives.
2. **BAN ON NEON/AI PURPLE GRADIENTS**: No oversaturated AI purple glows, neon gradient fills, or generic floating purple cards. All accents must strictly adhere to the calibrated **Siger Gold** (`#F59E0B`) and **Ocean Teal** (`#0D9488`).
3. **VIEWPORT STABILITY**: NEVER use `h-screen` for full-height hero sections. ALWAYS use `min-h-[100dvh]` to prevent iOS Safari address bar height jumping.
4. **GRID OVER FLEX MATH**: Use Tailwind CSS Grid (`grid grid-cols-1 md:grid-cols-3 gap-6`) for page components instead of fragile flexbox percentage calculations (`w-[calc(33%-1rem)]`).
5. **DETERMINISTIC TYPOGRAPHY**: Use `Plus Jakarta Sans` / `Inter` for UI body text and `Outfit` / `Sora` for display headings. No generic browser fallback fonts.
6. **LIQUID GLASS REFRACTION**: For glassmorphic panels, combine `backdrop-blur-md`, semi-transparent background (`bg-white/75`), 1px inner border (`border-slate-200/80`), and light drop shadow (`shadow-xl shadow-slate-900/5`).
7. **ATOMIC APPROVAL GATE**: Work strictly 1 backlog/page at a time. No jumping to subsequent backlogs until explicit user DEAL / approval is granted.

---

## 3. Comprehensive Design System & Design Tokens

### 3.1. Color Palette System

| Category | Token Name | Hex Code | Usage & Placement |
| :--- | :--- | :--- | :--- |
| **Base Background** | `bg-clean-light` | `#F8FAFC` | Latar belakang utama seluruh halaman website |
| **Surface Card** | `bg-surface-white` | `#FFFFFF` | Kontainer kartu destinasi, modal, & panel input |
| **Primary Ocean Teal** | `color-primary-600` | `#0D9488` | Tombol CTA utama, status aktif nav, & header aksen |
| **Primary Deep Teal** | `color-primary-800` | `#115E59` | Hover state tombol & judul teks berpenekanan |
| **Accent Siger Gold** | `color-accent-amber` | `#F59E0B` | Mahkota Siger logo, badge AI, rating bintang, & highlight |
| **Accent Coral Sunset**| `color-accent-coral` | `#FB923C` | Badge kategori Kuliner & highlight promo |
| **Neutral Dark Text** | `text-slate-900` | `#0F172A` | Judul utama (H1, H2, H3) & teks penting |
| **Neutral Body Text** | `text-slate-600` | `#475569` | Deskripsi paragraf & teks ulasan |
| **Neutral Border/Line**| `border-slate-200` | `#E2E8F0` | Border halus pada kartu & pembatas seksional |
| **Modal Overlay Blur** | `bg-backdrop-blur` | `rgba(15,23,42,0.6)` | Backdrop blur overlay Traveloka-style modal (blur 8px) |

### 3.2. Typography System

* **Primary Font Family (Body & UI Components)**: `'Plus Jakarta Sans', 'Inter', sans-serif`
* **Display Font Family (Headings & Hero Title)**: `'Outfit', 'Sora', sans-serif`

| Element | Font Weight | Desktop Size | Mobile Size | Line Height |
| :--- | :--- | :--- | :--- | :--- |
| **Hero Title (H1)** | Bold (700) | 52px | 34px | 1.2 |
| **Section Heading (H2)**| SemiBold (600) | 32px | 24px | 1.3 |
| **Card Title (H3)** | SemiBold (600) | 20px | 18px | 1.4 |
| **Body Regular** | Regular (400) | 16px | 14px | 1.6 |
| **Body Small** | Medium (500) | 14px | 13px | 1.5 |
| **Microcopy / Badge**| SemiBold (600) | 12px (Uppercase) | 11px | 1.0 |

### 3.3. Icon Library Standard

* **Primary Enterprise Icon Engine**: `Lucide-React` & `Heroicons v2` (Official SVG Vector Stroke Icons).
* **Criteria**: Strict 2px stroke width, consistent 24x24 bounding box, vector scalabilities, zero raster icons.

### 3.4. Static Visual Asset Directory Blueprint

* **Asset Directory Path**: `Website/Frontend/public/assets/images/`
* **Sub-directories**:
  1. `patterns/lampung-tapis-pattern.png` (Ornamen Motif Tapis Lampung)
  2. `heroes/hero-pahawang-bg.png` (Banner Latar Belakang Pahawang Island)
  3. `logos/siger-gold-icon.png` (Logo Mahkota Siger Emas)
  4. `mascot/muli-lampung-mascot.png` (Maskot Animasi Wanita Siger Adat Lampung untuk Chatbot AI)

---

## 4. Web Page Routing & Component Architecture

### 4.1. React Router DOM Routing Blueprint

| Route Path | Page View Component | Description & Responsibilities |
| :--- | :--- | :--- |
| `/` | `HomePage` | Hero Banner, Search Bar, AI Recommendations Carousel, Feature Highlights |
| `/explore` | `ExplorePage` | Spatial Radius Search, Interactive Destination Map, Filters |
| `/planner` | `PlannerPage` | Multi-Day Time-Slotted Itinerary Generator & Share Modal |
| `/favorites` | `FavoritesPage` | User Bookmarked Destinations List (Protected Route) |
| `/share/:shareToken` | `PublicSharePage` | Public View for Shared Itinerary Link |

### 4.2. Traveloka-Style Auth Modal Popup (Login & Register)

* **Behavior**: Triggered from Navbar `Masuk` / `Daftar` buttons.
* **Backdrop**: Smooth dark semi-transparent backdrop with gaussian blur overlay (`backdrop-filter: blur(8px); background: rgba(15, 23, 42, 0.6);`).
* **Modal Card**: Centered clean white card (`rounded-3xl`, shadow-2xl), with smooth enter/exit scale transition animation.

### 4.3. Component Tree Structure

```text
KelanaLampung Frontend App
├── Navbar (Sticky Glassmorphic Header)
│   ├── Brand Logo (Siger Gold Icon + KelanaLampung Text)
│   ├── Navigation Links (Home, Explore, AI Planner [Badge AI], Favorites)
│   └── Auth Action Buttons (Masuk [Outline], Daftar Gratis [Teal Filled])
│
├── AuthModal (Traveloka-Style Backdrop Blur Popup)
│   ├── Login Form (Email & Password Input + Access/Refresh Token handling)
│   └── Register Form (Full Name, Email, Password Input)
│
├── App Routes (React Router DOM)
│   ├── HomePage (/)
│   ├── ExplorePage (/explore)
│   ├── PlannerPage (/planner)
│   ├── FavoritesPage (/favorites)
│   └── PublicSharePage (/share/:shareToken)
│
├── RadenGajahAiChatbot (Floating Widget)
│   ├── Mascot Avatar Button (Muli Lampung Adat Avatar)
│   └── Chat Window Popup (Interactive Q&A with Virtual Assistant)
│
└── Footer Section
    ├── Brand Info & Social Media Links
    └── Copyright & Regional Tourism Disclaimer
```

---

## 5. REST API Integration Mapping (NestJS Gateway `http://localhost:4000/api/v1`)

| Frontend Feature Component | NestJS REST API Endpoint | HTTP Method | Auth Required |
| :--- | :--- | :--- | :---: |
| **User Register Modal** | `/auth/register` | `POST` | No |
| **User Login Modal** | `/auth/login` | `POST` | No |
| **Get Logged Profile** | `/auth/me` | `GET` | Yes (`Bearer JWT`) |
| **AI Recommendation Grid** | `/destinations/recommendations` | `POST` | No |
| **Popular Destinations** | `/destinations/popular` | `GET` | No |
| **Hidden Gems Section** | `/destinations/hidden-gems` | `GET` | No |
| **Destination Detail Modal** | `/destinations/:id` | `GET` | No |
| **Spatial Radius Search** | `/spatial/nearby` | `POST` | No |
| **Point Distance Calculator** | `/spatial/distance` | `GET` | No |
| **User Favorites List** | `/favorites` | `GET` | Yes (`Bearer JWT`) |
| **Add Favorite Bookmark** | `/favorites` | `POST` | Yes (`Bearer JWT`) |
| **Remove Favorite** | `/favorites/:canonicalId` | `DELETE` | Yes (`Bearer JWT`) |
| **Generate Multi-Day Itinerary**| `/planner/generate` | `POST` | Yes (`Bearer JWT`) |
| **Get Public Shared Itinerary** | `/planner/share/:shareToken` | `GET` | No |
| **Post Real-Time Review** | `/reviews` | `POST` | Yes (`Bearer JWT`) |
| **Get Sentiment Distribution**| `/reviews/:canonicalId` | `GET` | No |
| **Raden Gajah AI Chatbot** | `/chatbot/chat` | `POST` | No |

---

## 6. Technology Stack Specifications

* **Framework**: React.js 18+ with Vite (TypeScript)
* **Routing**: React Router DOM v6
* **Icon Engine**: `Lucide-React` & `Heroicons v2` (Enterprise SVG Vector Stroke Icons)
* **Styling & Design System**: Tailwind CSS v3 dengan Kustomisasi CSS Variables untuk Design Tokens
* **HTTP Client**: Axios dengan Interceptor (Penanganan Cookie HTTP-Only Refresh Token & Authorization Bearer Access Token)

# FRONTEND PRODUCT REQUIREMENTS DOCUMENT (PRD) & DESIGN BLUEPRINT
## Platform: KelanaLampung (Kelana Lampung) - AI-Powered Tourism Web Application

---

## 1. Executive Summary & Brand Identity

* **Brand Name**: **KelanaLampung** (Kelana Lampung)
* **Tagline**: *"Jelajah Surga Pariwisata Lampung Berbasis AI yang Personal & Akurat"*
* **Logo Concept**: Mahkota Siger Lampung berwarna **Siger Gold** (`#F59E0B`) dipadukan dengan tipografi modern beraksen **Ocean Teal** (`#0D9488`).
* **Design Philosophy**: *Ultra-Clean White Aesthetic, High Whitespace Contrast, Glassmorphism Micro-Interactions, and Authentic Lampung Culture*.

---

## 2. Comprehensive Design System & Design Tokens

### 2.1. Color Palette System

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

### 2.2. Typography System

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

### 2.3. Glassmorphism & Elevation Tokens

* **Glassmorphic Card Effect**: `backdrop-filter: blur(12px); background: rgba(255, 255, 255, 0.75); border: 1px solid rgba(226, 232, 240, 0.8);`
* **Card Drop Shadow**: `box-shadow: 0 10px 30px -5px rgba(15, 23, 42, 0.05);`
* **Card Border Radius**: `rounded-2xl` (16px) hingga `rounded-3xl` (24px) untuk estetika modern & ramah pengguna.

---

## 3. Web Page Architecture & Component Tree

```text
KelanaLampung Frontend App
├── Navbar (Sticky Glassmorphic Header)
│   ├── Brand Logo (Siger Gold Icon + KelanaLampung Text)
│   ├── Navigation Links (Home, Explore, AI Planner [Badge AI], Favorites)
│   └── Auth Action Buttons (Masuk [Outline], Daftar Gratis [Teal Filled])
│
├── HeroSection (Main Welcome Banner)
│   ├── AI Badge ("✨ Rekomendasi Wisata AI • 100% Lokal Lampung")
│   ├── Main Title ("Selamat Datang di Kelana Lampung") & Sub-description
│   ├── Integrated Search Bar (Keyword Input + Location Pill + Teal Action Button)
│   ├── Quick Action Buttons ("Destinasi Populer", "Mulai Menjelajah ↗")
│   └── Right Weather & Location Glass Widget (Pahawang Island, Category Quick Filters)
│
├── AiRecommendationsSection (Section 2)
│   ├── Section Header ("✨ Rekomendasi AI Untukmu") & Filter Categories
│   └── Destination Card Grid Carousel
│       ├── Image Cover with Category Pill & Bookmark Heart Trigger
│       ├── Title, City/Regency, & Estimated Travel Hours
│       └── Rating Stars & Review Count
│
├── SpatialNearbySection (Section 3 - PostGIS Radius Search)
│   ├── Interactive Coordinate Search Bar & Radius Slider (1 km - 50 km)
│   └── Nearby Destinations Card Grid & Distance Calculator Badge (km & mins)
│
├── AiPlannerSection (Section 4 - Itinerary Generator)
│   ├── Multi-Day Planner Form (Title, Duration Days 1-14, Budget Max IDR)
│   ├── Time-Slotted Daily Schedule Display (Morning, Lunch, Afternoon Sunset, Dinner)
│   └── Share Token Public Link Generator Modal
│
├── ReviewsSentimentSection (Section 5 - NLP Sentiment Analytics)
│   ├── Real-time Sentiment Review Form & Star Rating Input
│   └── Sentiment Analytics Summary Bar (Positive/Negative/Neutral Ratio)
│
├── RadenGajahAiChatbot (Floating Widget)
│   ├── Floating Icon Button (Bottom Right)
│   └── Chat Window Popup (Interactive Q&A with Raden Gajah Virtual Assistant)
│
└── Footer Section
    ├── Brand Info & Social Media Links
    ├── Quick Feature Highlights Bar (Informasi Terpercaya, Panduan Lengkap, Bantuan 24/7)
    └── Copyright & Regional Tourism Disclaimer
```

---

## 4. REST API Integration Mapping (NestJS Gateway `http://localhost:4000/api/v1`)

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

## 5. Technology Stack Specifications

* **Framework**: React.js 18+ with Vite (TypeScript)
* **Styling & Design System**: Vanilla CSS / Tailwind CSS v3 dengan Kustomisasi CSS Variables untuk Design Tokens
* **Icons**: Lucide-React / React-Icons (Minimalist modern stroke icons)
* **HTTP Client**: Axios dengan Interceptor (Penanganan Cookie HTTP-Only Refresh Token & Authorization Bearer Access Token)
* **Routing**: React Router DOM v6

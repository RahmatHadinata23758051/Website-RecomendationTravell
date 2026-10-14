![KelanaLampung Web Platform Banner](assets/banner.svg)

# KelanaLampung — Web Application Platform

**Multi-tier Tourism Discovery, AI Itinerary Planner, and RAG Digital Concierge for Lampung Province, Indonesia**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D18.0.0-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![NestJS](https://img.shields.io/badge/NestJS-10.3-E0234E?logo=nestjs&logoColor=white)](https://nestjs.com/)
[![React](https://img.shields.io/badge/React-18.2-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-5.1-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Prisma](https://img.shields.io/badge/Prisma-5.22-2D3748?logo=prisma&logoColor=white)](https://www.prisma.io/)

KelanaLampung Web Application Platform adalah implementasi full-stack yang mengintegrasikan React 18 Single Page Application (SPA), NestJS Backend-For-Frontend (BFF) Gateway, serta database PostgreSQL dan Redis. Repositori ini melayani eksplorasi geospasial destinasi wisata di 15 kabupaten dan kota se-Lampung, penyusunan rencana liburan multi-hari otomatis dengan perutean jalan nyata OSRM, asisten percakapan cerdas berbasis Retrieval-Augmented Generation (RAG) berpagar wilayah, alur crowdsourcing tempat wisata baru dengan moderasi administratif terverifikasi, dan pembagian tautan rencana perjalanan publik tanpa keharusan membuat akun.

---

## Daftar Isi

- [Problem dan Solution](#problem-dan-solution)
- [Key Features](#key-features)
- [Architecture atau How It Works](#architecture-atau-how-it-works)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Usage Examples](#usage-examples)
- [Configuration](#configuration)
- [Project Structure](#project-structure)
- [Visual Documentation](#visual-documentation)
- [Testing](#testing)
- [Security and Safety](#security-and-safety)
- [Limitations](#limitations)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [License](#license)

---

## Problem dan Solution

### Masalah yang Dihadapi
Informasi pariwisata di Provinsi Lampung tersebar pada berbagai sumber yang tidak terstruktur dengan beberapa kendala utama:
1. Kurangnya standarisasi koordinat geospasial dan validitas jam operasional serta fasilitas pendukung.
2. Sulitnya menyusun jadwal perjalanan multi-hari yang efisien dengan mempertimbangkan jarak berkendara jalan nyata dan batasan anggaran secara simultan.
3. Ketiadaan asisten digital terpadu yang membatasi informasinya secara ketat pada wilayah Lampung, sehingga chatbot umum rentan mengalami halusinasi lokasi ke luar provinsi.
4. Terbatasnya saluran partisipasi publik terverifikasi untuk mengajukan destinasi wisata lokal baru tanpa risiko duplikasi data.

### Solusi yang Diimplementasikan
Repositori ini menyediakan solusi arsitektur web modern:
- **Backend-For-Frontend (BFF)**: NestJS mengonsolidasikan autentikasi JWT, manajemen profil, bookmark favorit, penanganan audit log, serta orkestrasi RAG berbasis kata kunci terhadap katalog destinasi.
- **Microservice Integration**: Backend berkomunikasi secara internal via HTTP REST ke FastAPI Machine Learning Engine untuk memperoleh rekomendasi multi-objektif (Candidate 4 Hybrid), pemilahan slot jadwal harian, dan analisis sentimen ulasan pengunjung.
- **Client Web Responsif**: Frontend React 18 dengan Leaflet dan integrasi API publik OSRM untuk menggambar polyline rute jalan nyata dan menghitung waktu tempuh antar segmen perjalanan.
- **Alur Partisipasi dan Moderasi**: Sistem crowdsourcing tempat baru yang dilengkapi deteksi duplikasi spasial (Haversine < 200m) dan dashboard moderasi admin dengan log audit transaksional.

### Target Pengguna
- **Wisatawan Mandiri dan Keluarga**: Merencanakan perjalanan, melihat rute di peta interaktif, dan berkonsultasi dengan asisten wisata digital.
- **Komunitas Lokal dan Pemilik Usaha**: Mengajukan spot wisata baru beserta bukti kepemilikan dan detail fasilitas.
- **Administrator Kurasi**: Memeriksa, menyetujui, menolak, atau mempromosikan tempat baru ke dalam katalog sistem.

---

## Key Features

Fitur yang diuraikan berikut terverifikasi langsung dari file kode sumber repositori:

| Modul Fitur | Komponen Frontend | Endpoint Backend Gateway | Integrasi Layanan Terkait | Deskripsi Implementasi |
|---|---|---|---|---|
| **Pencarian dan Filter Spasial** | `ExplorePage.tsx` | `GET /api/v1/destinations` | FastAPI `:8000/api/v1/destinations` | Pencarian kata kunci nama/alamat, filter 15 kabupaten/kota, kategori, rentang harga, serta rendering marker peta Leaflet. |
| **Generator AI Itinerary 1–7 Hari** | `PlannerPage.tsx` | `POST /api/v1/planner/generate` | FastAPI `:8000/api/v1/planner/generate` | Pembagian jadwal otomatis per hari berdasarkan kabupaten, preferensi kategori, ritme tempo (Santai 3 slot vs Padat 5 slot), dan estimasi biaya total IDR. |
| **Tukar Slot Alternatif (Swap)** | `PlannerPage.tsx` | `POST /api/v1/planner/swap-slot` | FastAPI `:8000/api/v1/planner/swap-slot` | Penggantian satu slot destinasi dalam jadwal harian dengan opsi alternatif yang relevan tanpa duplikasi tempat yang sudah terpilih. |
| **Perutean Jalan Nyata OSRM** | `RouteMap3D.tsx`, `osrmRouting.ts` | Client-side direct call | OSRM Public Routing API | Pengambilan geometri garis mengemudi nyata (`/route/v1/driving`) dan estimasi durasi antar segmen. Fallback otomatis ke formula Haversine garis lurus jika layanan routing offline. |
| **Tautan Berbagi Rute Publik** | `PublicSharePage.tsx` | `GET /api/v1/itineraries/share/:shareToken` | PostgreSQL `itineraries` table | Pembuatan token UUID unik permanen per itinerary yang disimpan. Halaman rute publik dapat diakses tanpa autentikasi. |
| **Chatbot Asisten RAG (Raden Gajah)** | `RadenGajahChatWidget.tsx` | `POST /api/v1/chatbot/chat` | 9Router Gateway (`gemini-lampung-pool`) | Retrieval BM25 pada 2.889 metadata destinasi Lampung, injeksi konteks personal (jika login), sanitasi simbol bold `**` dan emoji, serta penolakan topik di luar pariwisata. |
| **Crowdsourcing & Moderasi Tempat** | `PlaceSubmitPage.tsx`, `AdminSubmissionsPage.tsx` | `POST/GET /api/v1/places/submissions` | `SubmissionDedupService`, ML Catalog Store | Pengajuan tempat baru, pencegahan duplikasi nama/koordinat, antrean moderasi admin, status perubahan transaksional, dan promosi tempat approved ke katalog ML. |
| **Koleksi Favorit & Riwayat** | `FavoritesPage.tsx`, `ProfilePage.tsx` | `GET/POST /api/v1/favorites`, `/api/v1/activity` | PostgreSQL `user_favorites`, `user_activities` | Penyimpanan bookmark tempat favorit berdasarkan canonical_id dan pencatatan riwayat interaksi pengguna dengan penambahan poin XP. |
| **Analisis Sentimen Ulasan** | `ExplorePage.tsx` | `POST /api/v1/reviews/analyze` | FastAPI `:8000/api/v1/sentiment/analyze` | Analisis sentimen teks ulasan Bahasa Indonesia (positif, netral, negatif) beserta skor confidence. |

---

## Architecture atau How It Works

Arsitektur aplikasi menerapkan pola *Three-Tier Web Application* dengan pemisahan tegas antara client presentation, gateway orkestrasi bisnis, dan microservice inferensi machine learning:

![Arsitektur Runtime Web](assets/architecture.svg)

```mermaid
flowchart LR
    subgraph ClientLayer ["Client Layer (Browser)"]
        SPA["React 18 + Vite SPA (:3001)\nTailwind CSS · Leaflet\nPublic & Protected Routes"]
    end

    subgraph GatewayLayer ["Backend Gateway / BFF (:4000)"]
        NestApp["NestJS Application\nThrottlerGuard · Helmet · ValidationPipe\nSwagger OpenAPI (/docs)"]
        AuthSvc["Auth Service\nJWT Access (15m) + Refresh (7d Cookie)\nRedis SHA-256 Blacklist"]
        RAGSvc["RagRetrieverService\nBM25 Keyword Search (2.889 Fakta)"]
        PlacesSvc["PlacesSubmissionService\nSpatial Dedup & Moderation Audit"]
    end

    subgraph DataLayer ["Persistence & Caching"]
        PG[("PostgreSQL\nPrisma ORM (9 Models)\nUsers, Itineraries, Submissions, Audit Logs")]
        RD[("Redis (:6379)\nCache & Session Store\n(In-Memory Fallback saat Dev)")]
    end

    subgraph MLEngine ["Machine Learning Engine (:8000)"]
        FastAPI["FastAPI REST API\nCandidate 4 Hybrid Recommender\nPlanner Multi-Day Algorithm\nSentiment NLP Pipeline"]
        CatalogOverlay[("CatalogStore Overlay\napproved_catalog_submissions.json")]
    end

    subgraph ExternalServices ["External Services"]
        Router9["9Router LLM Gateway (:20128)\nOpenAI-compatible /v1\nModel: gemini-lampung-pool"]
        OSRM["OSRM Public Routing API\nrouter.project-osrm.org"]
    end

    SPA -->|HTTP REST /api (Vite Proxy)| NestApp
    SPA -.->|Direct Driving Route Request| OSRM
    NestApp --> AuthSvc
    NestApp --> RAGSvc
    NestApp --> PlacesSvc
    NestApp -->|Prisma Client| PG
    NestApp -->|ioredis| RD
    NestApp -->|HTTP POST :8000/api/v1| FastAPI
    RAGSvc -->|Prompt Ingestion + Chat Request| Router9
    FastAPI <--> CatalogOverlay
```

### Penjelasan Aliran Data Komponen
1. **Frontend Presentation**: Mengelola antarmuka pengguna berbasis komponen React modular. Permintaan API dikirim ke path `/api` yang diproksikan secara lokal oleh development server Vite ke `http://localhost:4000` guna menghindari isu *Cross-Origin Resource Sharing* (CORS) dan *Private Network Access* (PNA).
2. **Backend Gateway (BFF)**: Berfungsi sebagai pintu gerbang tunggal yang memvalidasi skema payload masuk (`ValidationPipe`), memverifikasi otentikasi JWT, menerapkan rate limiting per-IP, dan mengabstraksi komunikasi internal ke database PostgreSQL serta Redis.
3. **Machine Learning Delegation**: Permintaan kalkulasi kompleks (seperti generate itinerary dan analisis sentimen) tidak diproses di NodeJS, melainkan diteruskan melalui HTTP POST ke microservice FastAPI yang memegang dataset 3.130 destinasi Lampung di memori.
4. **RAG Grounding**: Permintaan chatbot memicu pembacaan fakta destinasi relevan menggunakan algoritma BM25 lokal sebelum merakit system prompt ke gateway 9Router, mencegah halusinasi informasi.

---

## Installation

### Prerequisites Terverifikasi
- **Node.js**: Versi `>= 18.0.0` (LTS 20 direkomendasikan).
- **PostgreSQL**: Versi `>= 14` (mendukung schema Prisma).
- **Redis**: Versi `>= 6.0` (opsional untuk pengembangan lokal; backend memiliki fallback cache in-memory otomatis).
- **FastAPI ML Engine**: Service Python pada port `8000` (dijalankan dari direktori terpisah `Machine-Learning/`).
- **9Router LLM Gateway**: Gateway OpenAI-compatible pada port `20128` (opsional untuk pengembangan lokal; chatbot merespons HTTP 503 jika gateway tidak dikonfigurasi).

---

### Langkah 1: Setup Backend Gateway

```bash
cd Website/Backend

# Instalasi paket dependensi
npm install

# Buat file konfigurasi environment lokal
cp .env.example .env

# Sinkronisasikan schema Prisma ke PostgreSQL
npx prisma generate
npx prisma db push

# (Opsional) Jalankan data seed akun admin dan contoh data
npm run prisma:seed
```

---

### Langkah 2: Setup Frontend Client

```bash
cd Website/Frontend

# Instalasi paket dependensi
npm install

# Buat file konfigurasi environment lokal (opsional)
cp .env.example .env
```

---

### Langkah 3: Setup Dependensi ML Engine Pendukung

Agar fitur AI Planner, Rekomendasi, dan Analisis Sentimen dapat merespons, jalankan microservice ML di direktori `Machine-Learning/`:

```bash
cd ../Machine-Learning

# Inisialisasi virtual environment Python
python -m venv .venv

# Aktivasi virtual environment (Windows PowerShell)
.venv\Scripts\Activate.ps1
# Atau pada Linux / macOS:
# source .venv/bin/activate

# Instal dependensi eksekusi minimal
pip install pandas numpy scikit-learn fastapi uvicorn pyarrow pydantic
```

---

## Quick Start

Jalankan ketiga service berikut pada terminal terpisah:

### Terminal 1: Machine Learning Engine (Port 8000)
```powershell
cd Machine-Learning
$env:PYTHONPATH = (Get-Location).Path
.venv\Scripts\python.exe -m uvicorn Model.api.app:app --host 0.0.0.0 --port 8000
```
Verifikasi status via browser: `http://localhost:8000/api/v1/health` (respons JSON `status: healthy`, `total_attractions_loaded: 3130`).

### Terminal 2: Backend Gateway (Port 4000)
```bash
cd Website/Backend
npm run start:dev
```
Verifikasi status via browser: `http://localhost:4000/api/v1/health` atau buka dokumentasi interaktif di `http://localhost:4000/docs`.

### Terminal 3: Frontend Client (Port 3001)
```bash
cd Website/Frontend
npm run dev
```
Akses aplikasi melalui peramban web pada alamat: **`http://localhost:3001`**.

---

## Usage Examples

### 1. Pembuatan Itinerary Perjalanan via REST API

Membuat rencana liburan 2 hari di Kabupaten Pesawaran dengan preferensi kategori Pantai:

```bash
curl -X POST http://localhost:4000/api/v1/planner/generate \
  -H "Content-Type: application/json" \
  -d '{
    "city_or_regency": "Kabupaten Pesawaran",
    "primary_category": "Pantai",
    "budget_level": "Standar",
    "pace_style": "Santai",
    "duration_days": 2
  }'
```

Contoh struktur respons terverifikasi dari backend:
```json
{
  "status": "success",
  "message": "AI Itinerary generated successfully",
  "regency": "Kabupaten Pesawaran",
  "duration_days": 2,
  "total_cost_estimate_idr": 120000,
  "itinerary": [
    {
      "dayNumber": 1,
      "title": "Hari 1 - Eksplorasi Kabupaten Pesawaran",
      "slots": [
        {
          "canonical_id": "lampung_pesawaran_pantai_mutun",
          "time": "08:30 - 11:30",
          "activityTitle": "Pantai Mutun",
          "category": "beach",
          "location": "Kabupaten Pesawaran",
          "estimatedCost": "Rp 25.000",
          "numericCost": 25000,
          "coords": [-5.5186, 105.2694],
          "image": "/assets/images/heroes/hero-pahawang-bg.png",
          "aiTip": "Pagi hari ideal untuk menikmati ombak tenang dan pantai pasir putih."
        }
      ]
    }
  ],
  "savedItinerary": null,
  "shareUrl": null
}
```
*(Catatan: `savedItinerary` dan `shareUrl` akan bernilai jika request menyertakan Bearer Token otentikasi).*

### 2. Pertanyaan Asisten Wisata Digital (RAG)

Mengirim pertanyaan pariwisata spesifik wilayah Lampung:

```bash
curl -X POST http://localhost:4000/api/v1/chatbot/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "rekomendasi pantai yang bagus di pesawaran",
    "regency": "Kabupaten Pesawaran",
    "category": "Pantai",
    "history": []
  }'
```

Contoh struktur respons terverifikasi:
```json
{
  "status": "success",
  "bot_name": "Asisten KelanaLampung",
  "data": {
    "reply": "Tabik Pun! Di Kabupaten Pesawaran, Anda dapat mengunjungi Pantai Sari Ringgung yang terkenal dengan pasir timbul dan fasilitas lengkap, serta Pantai Mutun yang sangat cocok untuk rekreasi keluarga...",
    "suggested_queries": [
      "Rekomendasi pantai di Pesawaran",
      "Tempat makan Seruit khas Lampung",
      "Wisata populer di Bandar Lampung"
    ]
  }
}
```

### 3. Mengakses Detail Rute dari Share Token Publik

Mengambil data rencana perjalanan publik tanpa memerlukan login:

```bash
curl -X GET http://localhost:4000/api/v1/itineraries/share/9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d
```

---

## Configuration

Daftar seluruh parameter konfigurasi environment yang didukung sistem (hanya mencantumkan nama variabel tanpa nilai rahasia):

### Backend Gateway (`Website/Backend/.env`)
| Nama Variabel | Wajib | Nilai Default Dev | Keterangan Fungsi |
|---|:---:|---|---|
| `PORT` | Tidak | `4000` | Port listen server NestJS. |
| `NODE_ENV` | Ya | `development` | Mode runtime (`development` atau `production`). |
| `ALLOWED_ORIGINS` | Ya (Prod) | `http://localhost:3000,http://localhost:3001` | Daftar domain CORS yang diizinkan (dipisahkan koma). Di mode produksi dilarang mencantumkan localhost. |
| `DATABASE_URL` | Ya | — | Connection string PostgreSQL (format: `postgresql://user:pass@host:5432/db?schema=public`). |
| `REDIS_HOST` | Ya (Prod) | `localhost` | Host jaringan server Redis. |
| `REDIS_PORT` | Ya (Prod) | `6379` | Port jaringan server Redis. |
| `JWT_ACCESS_SECRET` | Ya | dev secret | Kunci tanda tangan JWT access token (minimal 32 karakter pada mode produksi). |
| `JWT_REFRESH_SECRET` | Ya | dev secret | Kunci tanda tangan JWT refresh token cookie (minimal 32 karakter dan harus berbeda dari access secret). |
| `ML_ENGINE_URL` | Ya (Prod) | `http://localhost:8000` | Base URL endpoint microservice FastAPI Machine Learning. |
| `ML_ENGINE_HEALTH_URL` | Tidak | `http://localhost:8000/api/v1/health` | URL pemeriksaan ketersediaan service FastAPI. |
| `NINE_ROUTER_URL` / `OPENAI_BASE_URL` | Ya (Prod) | `http://localhost:20128/v1` | Base URL endpoint gateway LLM OpenAI-compatible. |
| `NINE_ROUTER_API_KEY` / `OPENAI_API_KEY` | Ya (Prod) | — | Kunci otorisasi header API gateway LLM. |
| `NINE_ROUTER_MODEL` / `OPENAI_MODEL` | Tidak | `gemini-lampung-pool` | Model ID yang dialokasikan pada gateway LLM. |
| `NINE_ROUTER_TIMEOUT_MS` | Tidak | `60000` | Batas waktu tunggu respons LLM dalam milidetik (rentang valid: 1000–300000). |

### Frontend Client (`Website/Frontend/.env`)
| Nama Variabel | Wajib | Nilai Default Dev | Keterangan Fungsi |
|---|:---:|---|---|
| `VITE_API_BASE_URL` | Tidak | `/api/v1` (via Vite proxy) | Alamat target endpoint backend gateway jika tidak menggunakan development proxy. |
| `VITE_OPENWEATHER_API_KEY` | Tidak | — | Kunci API OpenWeatherMap untuk widget cuaca (fallback otomatis ke Open-Meteo bila kosong). |

---

## Project Structure

```text
Website/
├── assets/                               # Aset visual original dokumentasi
│   ├── banner.svg                        # Banner utama header repositori
│   └── architecture.svg                  # Diagram topologi runtime web
├── Backend/                              # NestJS BFF Gateway Application (Port 4000)
│   ├── prisma/
│   │   ├── schema.prisma                 # Schema PostgreSQL (9 model relasional, 4 enum)
│   │   ├── seed.ts                       # Seeding data pengguna awal
│   │   └── migrations/                   # Riwayat migrasi DDL database
│   ├── src/
│   │   ├── auth/                         # Modul autentikasi JWT, password hashing, roles decorator
│   │   ├── chatbot/                      # Orkestrasi RAG, BM25 retriever, 9Router LLM client
│   │   ├── destinations/                 # Controller & proxy permintaan destinasi ke ML
│   │   ├── favorites/                    # Manajemen bookmark destinasi pengguna
│   │   ├── itineraries/                  # Penyimpanan jadwal & resolusi shareToken publik
│   │   ├── places/                       # Crowdsourcing tempat, dedup Haversine, moderasi & audit log
│   │   ├── planner/                      # Proxy permintaan AI itinerary generator & swap-slot
│   │   ├── reviews/                      # Manajemen ulasan ulasan pengguna & proxy sentimen NLP
│   │   ├── spatial/                      # Pencarian destinasi terdekat berbasis radius koordinat
│   │   ├── redis/                        # Abstraksi koneksi Redis dengan fallback in-memory cache
│   │   ├── health/                       # Healthcheck controller (PostgreSQL, Redis, ML status)
│   │   ├── common/
│   │   │   ├── config/env-validation.ts  # Validasi konfigurasi startup fail-fast
│   │   │   ├── filters/                  # Exception filter global standard JSON
│   │   │   └── interceptors/             # Performance latency logging interceptor
│   │   ├── app.module.ts                 # Komposisi dependensi root NestJS & throttler configuration
│   │   └── main.ts                       # Entrypoint aplikasi: Helmet, CORS, ValidationPipe, Swagger UI
│   ├── test/                             # Test suite: e2e security, places submission, app spec
│   └── eval/                             # Dataset evaluasi RAG: golden-queries.json & baseline-metrics.json
└── Frontend/                             # React 18 + Vite SPA Client (Port 3001)
    ├── public/                           # Aset web statis, gambar hero destinasi, data fallback
    ├── src/
    │   ├── components/                   # Navbar, Footer, RouteMap3D (Leaflet), RadenGajahChatWidget
    │   ├── context/                      # AuthContext (state sesi), ToastContext (notifikasi UI)
    │   ├── pages/
    │   │   ├── HomePage.tsx              # Beranda, widget cuaca, highlight kategori
    │   │   ├── ExplorePage.tsx           # Katalog eksplorasi interaktif & peta spasial
    │   │   ├── PlannerPage.tsx           # Form pembuatan & visualisasi rute AI itinerary
    │   │   ├── FavoritesPage.tsx         # Halaman bookmark tersimpan pengguna terdaftar
    │   │   ├── ProfilePage.tsx           # Pengaturan profil, preferensi, dan perolehan skor XP
    │   │   ├── PublicSharePage.tsx       # Tampilan detail rute dari tautan shareToken publik
    │   │   ├── PlaceSubmitPage.tsx       # Form pengajuan tempat wisata baru
    │   │   └── AdminSubmissionsPage.tsx  # Dashboard review moderasi bagi akun ber-role ADMIN
    │   ├── services/                     # Abstraksi HTTP Axios (destinationsApi, chatbotApi, osrmRouting)
    │   ├── lib/                          # Inisialisasi apiClient, handler error standar, utility Tailwind
    │   ├── App.tsx                       # Deklarasi router, pembagian public/protected route, lazy loading
    │   └── main.tsx                      # Entry point React DOM render
    ├── scripts/
    │   └── frontend-p0p1.test.mjs        # Script pengujian otomatis jalur kritis antarmuka (P0/P1)
    └── vite.config.ts                    # Konfigurasi dev port 3001 & reverse proxy /api ke port 4000
```

---

## Visual Documentation

### 1. Siklus Pembuatan Itinerary dan Resolusi Rute Jalan

```mermaid
sequenceDiagram
    autonumber
    actor Pengunjung as Pengguna Web (Browser)
    participant Front as Frontend (PlannerPage)
    participant Nest as NestJS BFF Gateway (:4000)
    participant ML as FastAPI ML Engine (:8000)
    participant OSRM as OSRM Routing Service
    participant DB as PostgreSQL Database

    Pengunjung->>Front: Tentukan Kabupaten, Kategori, Budget & Jumlah Hari
    Pengunjung->>Front: Klik Buat Rencana Perjalanan
    Front->>Nest: POST /api/v1/planner/generate
    Nest->>ML: POST /api/v1/planner/generate
    ML->>ML: Candidate 4 Hybrid Scoring & Pembagian Slot Harian
    ML-->>Nest: Payload Itinerary (Daftar Hari & Slot Koordinat)
    Nest-->>Front: Respons JSON Rencana Liburan
    Front->>OSRM: GET /route/v1/driving/{coords}
    OSRM-->>Front: GeoJSON Geometri Garis Jalan & Durasi Tempuh
    Front->>Front: Gambar Garis Teal Polyline pada Peta Leaflet
    opt Jika Pengguna Login & Ingin Berbagi
        Pengunjung->>Front: Klik Simpan & Bagikan
        Front->>Nest: POST /api/v1/itineraries (title, daysJson)
        Nest->>DB: INSERT into itineraries (Generate shareToken UUID)
        DB-->>Nest: Record Tersimpan
        Nest-->>Front: { status: success, shareToken: 9b1deb4d... }
        Front->>Pengunjung: Tampilkan tautan publik /share/9b1deb4d...
    end
```

### 2. Siklus Pengambilan Fakta RAG Asisten Wisata Digital

```mermaid
sequenceDiagram
    autonumber
    actor User as Pengunjung Web
    participant Widget as RadenGajahChatWidget
    participant Ctrl as ChatbotController (:4000)
    participant Retriever as RagRetrieverService
    participant LLM as 9Router LLM Gateway (:20128)

    User->>Widget: Kirim pesan seputar pariwisata Lampung
    Widget->>Ctrl: POST /api/v1/chatbot/chat { message, regency, category }
    Ctrl->>Retriever: retrieveRelevantFacts(message, regency, category)
    Retriever->>Retriever: BM25 Keyword Search pada 2.889 metadata tempat
    Retriever-->>Ctrl: Daftar Fakta Destinasi Terverifikasi
    Ctrl->>Ctrl: Susun System Prompt (Domain Guardrails & Larangan Emoji)
    Ctrl->>LLM: POST /v1/chat/completions (model: gemini-lampung-pool)
    alt Gateway Aktif dan Menjawab
        LLM-->>Ctrl: Teks Jawaban Pemandu Wisata
        Ctrl->>Ctrl: Sanitasi Simbol Markdown ** dan Karakter Khusus
        Ctrl-->>Widget: { status: success, reply: Tabik Pun! ..., suggested_queries: [...] }
        Widget->>User: Tampilkan Balasan Chatbot
    else Gateway Offline atau Batas Waktu Terlampaui
        Ctrl-->>Widget: HTTP 503 Service Unavailable
        Widget->>User: Tampilkan Pemberitahuan Layanan Sedang Tidak Tersedia
    end
```

### 3. Mesin Status Moderasi Tempat Pengajuan (Place Submission Lifecycle)

```mermaid
stateDiagram-v2
    [*] --> PENDING: Pengguna Mengajukan Form (/submit-place)
    PENDING --> UNDER_REVIEW: Admin Membuka Antrean Moderasi
    UNDER_REVIEW --> APPROVED: Admin Menyetujui Keabsahan Tempat
    UNDER_REVIEW --> REJECTED: Foto / Informasi Fiktif atau Tidak Sesuai
    UNDER_REVIEW --> NEEDS_MORE_INFO: Data Koordinat / Fasilitas Kurang Lengkap
    UNDER_REVIEW --> DUPLICATE: Terdeteksi Duplikat dengan Tempat Eksisting

    APPROVED --> PROMOTED: Sistem Mendorong ke CatalogStore ML Engine
    PROMOTED --> [*]: Tersedia dalam Rekomendasi & Pencarian
    REJECTED --> [*]
```

---

## Testing

Repositori ini menyertakan test suite terverifikasi untuk memvalidasi fungsionalitas logika bisnis, otentikasi, jalur kritis UI, dan retrieval RAG:

### 1. Backend Gateway Unit, E2E & RAG Golden Eval (Jest)

```bash
cd Website/Backend

# Menjalankan seluruh pengujian unit
npm run test

# Menjalankan pengujian cakupan kode (coverage)
npm run test:cov

# Menjalankan pengujian integrasi end-to-end (Auth, Security, STRIDE)
npm run test:e2e

# Menjalankan evaluasi kuantitatif RAG retrieval terhadap 15 golden queries
npm run test:eval
```

Catatan Baseline Evaluasi RAG terukur dari file `Website/Backend/eval/README.md`:
- `precisionAt3`: `0.733`
- `hitRate`: `1.0` (100% dari 15 query evaluasi berhasil menarik minimal 1 kandidat relevan di Top-3)
- `ndcg`: `0.779`
- `avgDiversity`: `4.4` (keberagaman kategori unik yang direkomendasikan)

### 2. Frontend Critical Path Test (Node Test Runner)

```bash
cd Website/Frontend

# Menjalankan validasi pengujian jalur kritis komponen P0/P1
npm run test:p0p1

# Menjalankan type-checking TypeScript dan kompilasi bundle produksi
npm run build
```

---

## Security and Safety

Berdasarkan analisis ancaman pada dokumen *STRIDE Threat Model* (`Website/security-threat-model-placesubmit.md`) dan inspeksi implementasi kode sumber:

### Kontrol Keamanan yang Terverifikasi
- **Penyaringan Input Terpusat**: NestJS `ValidationPipe` disetel secara ketat dengan opsi `whitelist: true`, `transform: true`, dan `forbidNonWhitelisted: true` untuk mengeliminasi serangan *Mass Assignment*.
- **Pencegahan SQL Injection**: Seluruh transaksi persistensi data menggunakan Prisma ORM yang secara baku memanfaatkan *parameterized queries*.
- **Enkripsi Kredensial**: Password akun pengguna di-hash menggunakan algoritma `bcrypt` dengan faktor kerja (*salt rounds*) 12 sebelum disimpan ke tabel `users`.
- **Manajemen Token Bertingkat**:
  - Access Token JWT berumur pendek (15 menit) dikirimkan melalui header `Authorization: Bearer`.
  - Refresh Token JWT berumur 7 hari disimpan dalam cookie peramban dengan atribut `HttpOnly`, `SameSite=Lax`, dan `Secure` (pada mode produksi).
  - Blacklist token saat pengguna keluar (*logout*) disimpan ke dalam Redis menggunakan hash cryptographic SHA-256 (bukan raw token string).
- **Pembatasan Laju Beban (Rate Limiting)**: Pustaka `@nestjs/throttler` membatasi lalu lintas endpoint publik secara baku maksimal 60 request per menit, serta endpoint login dibatasi ketat 5 request per menit untuk memitigasi serangan brute-force.
- **Standarisasi Header Keamanan**: Middleware `helmet` diaktifkan pada NestJS untuk menegakkan standar HTTP security headers (termasuk Content-Security-Policy dasar, HSTS, X-Content-Type-Options, dan proteksi clickjacking).
- **Akuntabilitas Audit Log**: Setiap mutasi status verifikasi tempat wisata dicatat ke dalam entitas relasional `PlaceSubmissionAuditLog` bersama ID moderator, status asal, status tujuan, catatan alasan, dan stempel waktu.

### Batasan Keamanan dan Risiko Residu (Residual Risks)
- **Throttler In-Memory pada Konfigurasi Bawaan**: Jika server berjalan tanpa konfigurasi Redis cluster, pencatatan hit rate limiter disimpan di memori proses tunggal sehingga tidak terbagi otomatis pada arsitektur multi-instance horizontal.
- **Sifat Stateless Access Token**: Access token yang telah diterbitkan tidak dapat dibatalkan di tengah jalan (*cannot be revoked mid-flight*) sampai masa kedaluwarsa 15 menit berakhir.
- **Kebijakan CORS Lingkungan Produksi**: Skrip startup `env-validation.ts` akan menolak booting jika parameter `ALLOWED_ORIGINS` terdeteksi masih mengandung `localhost` atau `127.0.0.1` saat `NODE_ENV=production`.

---

## Limitations

Hal-hal yang secara objektif belum didukung atau menjadi batasan sistem saat ini berdasarkan bukti kode:
1. **Tidak Ada Sinkronisasi Otomatis ML ke PostgreSQL**: Dataset 3.130 destinasi wisata dikelola sebagai file statis Parquet/JSON oleh service ML. Promosi tempat baru disimpan ke file durable overlay JSON pada sisi ML dan belum memiliki mekanisme replikasi sinkron dua arah otomatis ke tabel relasional PostgreSQL.
2. **Bahasa Tunggal (Indonesian Only)**: Seluruh antarmuka web, pesan sistem, dataset ulasan, dan struktur prompt RAG menggunakan Bahasa Indonesia. Belum tersedia modul internasionalisasi (i18n).
3. **Klien Berbasis Web Saja**: Platform saat ini murni berupa Single Page Application berbasis web peramban. Belum tersedia aplikasi native mobile (Android APK / iOS IPA); adaptasi tampilan gawai mengandalkan tata letak responsif CSS.
4. **Ketergantungan Layanan OSRM Publik**: Jalur rute jalan raya bergantung pada ketersediaan endpoint publik pihak ketiga (`router.project-osrm.org`) yang memiliki batas kuota. Jika koneksi rute gagal, antarmuka frontend beralih ke perhitungan jarak lurus Haversine.
5. **Chatbot Belum Mendukung Streaming Respons**: Endpoint chatbot mengembalikan teks jawaban secara penuh dalam satu payload JSON (`stream: false`), belum menggunakan arsitektur Server-Sent Events (SSE).

---

## Roadmap

Rencana pengembangan yang diturunkan secara faktual dari issue pelacakan dan dokumen arsitektur:

- [ ] **Penyimpanan Rate Limiter Berbasis Redis**: Mengalihkan storage `@nestjs/throttler` dari in-memory ke Redis cluster terdistribusi untuk mendukung penskalaan instans backend secara horizontal (`security-threat-model-placesubmit.md`).
- [ ] **Verifikasi Webhook Berbasis HMAC**: Menambahkan mekanisme tanda tangan digital HMAC pada pertukaran payload sinkronisasi katalog antara Backend Gateway dan ML Engine.
- [ ] **Dukungan Streaming Respons Chatbot**: Mengimplementasikan streaming Server-Sent Events (SSE) pada controller chatbot untuk mengurangi *perceived latency* bagi pengguna akhir.
- [ ] **Mekanisme Offline Tile Caching**: Menambahkan Service Worker untuk menyimpan cache tile peta Leaflet demi menjaga pengalaman navigasi pada koneksi seluler tidak stabil.

---

## Contributing

Pengembangan repositori ini menyambut kontribusi dengan alur kerja terstandarisasi:

1. Buat salinan (*fork*) repositori dan buat branch fitur baru (`git checkout -b feature/nama-fitur-baru`).
2. Pastikan kode memenuhi aturan linter dan tidak merusak build:
   ```bash
   # Validasi Backend
   cd Website/Backend
   npm run lint
   npm run test

   # Validasi Frontend
   cd Website/Frontend
   npm run build
   ```
3. Jangan menyertakan file sensitif, file konfigurasi lokal (`.env`), token credential, atau file dump database ke dalam commit.
4. Buka Pull Request dengan ringkasan perubahan teknis yang jelas beserta bukti kelulusan pengujian lokal.

---

## License

Proyek ini dilisensikan di bawah ketentuan **MIT License** sebagaimana dinyatakan pada metadata berkas `Website/Backend/package.json`.

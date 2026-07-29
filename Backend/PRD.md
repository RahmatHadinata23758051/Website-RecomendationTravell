# Product Requirements Document (PRD) — Website Backend Gateway
# Recommendation Traveller Lampung (NestJS Enterprise Architecture)

| Document Meta | Details |
| :--- | :--- |
| **Document Name** | Website Backend Gateway PRD (Hardened Security Baseline) |
| **Target Framework** | NestJS (Node.js / TypeScript) |
| **Primary Database** | PostgreSQL (via Prisma ORM & PostGIS Extension) |
| **In-Memory Cache** | Redis |
| **ML Engine Microservice** | FastAPI Service (`POST /api/v1/recommendations`, `POST /api/v1/sentiment/analyze`) |
| **Security Standard** | OWASP Top 10 Hardened Baseline |
| **Status** | Approved Specification (Security-Emphasized Baseline) |
| **Last Updated** | 29 Juli 2026 |

---

## 1. Overview & Architectural Philosophy

Dokumen ini mendefinisikan spesifikasi rekayasa perangkat lunak dan **standar keamanan berlapis (*Defense-in-Depth Security*)** untuk **Backend Gateway Website Recommendation Traveller Lampung**. 

Backend ini bertindak sebagai **Backend-For-Frontend (BFF)** terpisah yang mengisolasi logika bisnis web (Otentikasi User, Bookmark Favorit, Planning Trip, Chatbot Assistant, & Spasial PostGIS) dari **ML Recommendation Engine (FastAPI)**.

---

## 2. 9 Modul Layanan Utama (NestJS Enterprise Modules)

### 2.1 AuthModule & Security Core
* **Registrasi & Login**: Email & Password dengan enkripsi `bcrypt` (salt rounds: 12).
* **JWT Dual-Token Management**: Access Token (TTL: 15 menit) & Refresh Token (TTL: 7 hari) disimpan dalam `HTTP-Only SameSite=Strict Cookie`.
* **Guards & Middleware**: `JwtAuthGuard`, `RolesGuard` (RBAC `USER` vs `ADMIN`), & validasi session token revocation di Redis.

### 2.2 DestinationsModule & Caching Strategy
* **Proxy ke ML Engine**: Mengirim preferensi user ke FastAPI ML Engine (`POST /api/v1/recommendations`).
* **Redis Query Caching**: Hash key query (`cache:rec:<md5_query>`) dengan TTL 1 jam untuk menghemat beban komputasi server ML.

### 2.3 FavoritesModule
* **Relasi Database**: Menyimpan bookmark destinasi per `userId` dan `canonicalId` di PostgreSQL.

### 2.4 PlannerModule & Geospatial Route Generator
* **Itinerary Generator**: Menyimpan & menggenerasi skenario perjalanan harian (*Saved Trips*) dalam format JSON terstruktur (`daysJson`) per hari (Pagi, Siang, Malam) lengkap dengan optimasi jarak terdekat sejalur (PostGIS `ST_DistanceSphere`) dan estimasi total biaya (IDR).
* **Public Sharing**: Menggenerasi `shareToken` unik agar rute liburan pengguna dapat diakses secara publik.

### 2.5 ReviewsModule & Real-Time Sentiment
* **Real-Time Sentiment Analysis**: Menerima ulasan pengunjung dan memicu inferensi sentimen ke FastAPI ML Engine (`POST /api/v1/sentiment/analyze`) secara instan.

### 2.6 ChatbotModule (AI Concierge "Raden Gajah / Tapis AI")
* **AI Conversational Proxy**: Menerima pertanyaan percakapan dari pengguna dan menggabungkan konteks rekomendasi ML Candidate 4 ke dalam jawaban pesan interaktif.

### 2.7 SpatialModule (PostGIS Nearby Search)
* **Pencarian Terdekat Radius GPS**: Menggunakan fungsi geografis PostGIS `ST_DWithin` & `ST_DistanceSphere` untuk menghitung destinasi wisata terdekat secara akurat dari titik koordinat GPS pengguna saat ini di Lampung.

### 2.8 ExploreDiscoveryModule (Destinasi Populer & Hidden Gems)
* **Destinasi Populer**: Mengurutkan destinasi berdasarkan jumlah ulasan positif terbanyak.
* **Hidden Gems Lampung**: Mengurasi destinasi alami bernilai sentimen tinggi namun belum banyak diketahui publik.

### 2.9 ExportShareModule (Shareable Itinerary)
* **Penyebaran Jadwal Perjalanan**: Menggenerasi token/link unik publik (`/api/v1/planner/:id/share`) agar itinerary dapat dibagikan antar wisatawan.

---

## 3. Spesifikasi Keamanan Berlapis (Security & Hardening Architecture)

### 3.1 Otentikasi & Proteksi Sesi (Session Security)
1. **JWT Dual-Token Pattern**:
   * **Access Token**: Memiliki masa aktif sangat singkat (15 Menit) untuk meminimalisir risiko apabila token tercuri.
   * **Refresh Token**: Disimpan dalam `HTTP-Only Cookie` dengan atribut `SameSite=Strict` dan `Secure=true`. *Cookie ini 100% tidak dapat dibaca atau diakses oleh skrip JavaScript di browser (kebal dari XSS attacks)*.
2. **Instant Logout & Token Blacklisting**:
   * Ketika pengguna melakukan logout atau mengubah password, Refresh Token langsung di-blacklist di memori **Redis**, sehingga token lama tidak dapat digunakan kembali seketika (*Instant Revocation*).
3. **Password Hashing Standard**:
   * Menggunakan algoritma **Bcrypt dengan 12 Salt Rounds**, menjamin ketahanan dari *Brute-Force Rainbow Table Attacks*.

### 3.2 Proteksi Serangan Web Utama (OWASP Top 10 Hardening)
1. **Pencegahan SQL Injection**:
   * 100% Query Database dieksekusi melalui **Prisma ORM Parameterized Queries** dan *type-safe spatial functions* di PostGIS. Dilarang keras menggunakan *raw string concatenation SQL*.
2. **Pencegahan Cross-Site Scripting (XSS)**:
   * Seluruh string input pengguna (misal: isi teks ulasan atau nama itinerary) di-sanitasi ketat menggunakan NestJS `class-validator` (`@IsString()`, `@SanitizeHtml()`, `@Trim()`) sebelum masuk ke database.
3. **Pencegahan Brute-Force & Rate Limiting (DDoS Protection)**:
   * Menerapkan **NestJS Throttler Module (`@nestjs/throttler`)**:
     * **Public API Rate Limit**: Maksimal 60 request per menit per alamat IP.
     * **Auth Rate Limit (`/login`, `/register`)**: Maksimal 5 percobaan login per 15 menit per alamat IP untuk mencegah *Brute-Force Password Cracking*.
4. **Keamanan HTTP Headers (Helmet Integration)**:
   * Mengintegrasikan middleware **`Helmet`** untuk mengaktifkan proteksi header bawaan browser:
     * `Strict-Transport-Security (HSTS)`: Memaksa koneksi HTTPS.
     * `Content-Security-Policy (CSP)`: Mencegah eksekusi skrip dari domain tidak dikenal.
     * `X-Frame-Options: DENY`: Mencegah serangan *Clickjacking* (web di-embed dalam iframe jahat).
     * `X-Content-Type-Options: nosniff`: Mencegah *MIME-type Sniffing*.

### 3.3 CORS & Network Isolation (BFF Security Boundary)
1. **Strict CORS Policy**:
   * Rute API NestJS hanya menerima koneksi dari origin resmi Frontend Web (`https://traveller-lampung.site` atau `http://localhost:3000`).
2. **FastAPI ML Engine Isolation**:
   * Service ML FastAPI (`http://localhost:8000`) **100% tersembunyi dalam VPC/Private Subnet internal**. ML Engine tidak dibuka ke publik internet dan hanya dapat diakses oleh server NestJS Backend.

---

## 4. Database Schema Blueprint (PostgreSQL Prisma + PostGIS)

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model User {
  id            String         @id @default(uuid())
  email         String         @unique
  passwordHash  String
  fullName      String
  role          UserRole       @default(USER)
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt
  favorites     UserFavorite[]
  itineraries   Itinerary[]
  reviews       Review[]
}

enum UserRole {
  USER
  ADMIN
}

model UserFavorite {
  id          String   @id @default(uuid())
  userId      String
  canonicalId String
  createdAt   DateTime @default(now())
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, canonicalId])
}

model Itinerary {
  id          String   @id @default(uuid())
  userId      String
  title       String
  shareToken  String   @unique @default(uuid())
  daysJson    Json
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model Review {
  id             String   @id @default(uuid())
  userId         String
  canonicalId    String
  rating         Int
  reviewText     String
  sentimentLabel String   // positive, neutral, negative
  sentimentScore Float
  createdAt      DateTime @default(now())
  user           User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([canonicalId])
}
```

---

## 5. Pemetaan Lengkap Endpoint REST API NestJS (17 Endpoints)

| Endpoint Path | Method | Auth Required | Rate Limit | Description & Security Policy |
| :--- | :--- | :--- | :--- | :--- |
| **`/api/v1/auth/register`** | `POST` | Public | 5 req / 15m | Input validation + Bcrypt 12 rounds |
| **`/api/v1/auth/login`** | `POST` | Public | 5 req / 15m | Sets HTTP-Only SameSite=Strict Cookie |
| **`/api/v1/auth/refresh`** | `POST` | Public (Cookie) | 10 req / 1m | Validates Refresh Cookie & Session in Redis |
| **`/api/v1/auth/logout`** | `POST` | JWT Guard | 10 req / 1m | Revokes Session in Redis & Clears Refresh Cookie |
| **`/api/v1/destinations/recommendations`** | `POST` | Public | 60 req / 1m | Sanitized Filter $\rightarrow$ Redis Cache $\rightarrow$ ML Engine |
| **`/api/v1/destinations/popular`** | `GET` | Public | 60 req / 1m | Cached Top Popular Attractions |
| **`/api/v1/destinations/hidden-gems`** | `GET` | Public | 60 req / 1m | Cached High-Sentiment Hidden Gems |
| **`/api/v1/destinations/nearby`** | `POST` | Public | 60 req / 1m | PostGIS Parameterized Spatial Search |
| **`/api/v1/destinations/:id`** | `GET` | Public | 60 req / 1m | Destination Metadata + Sentiment Summary |
| **`/api/v1/favorites`** | `GET` | JWT Guard | 60 req / 1m | User Saved Bookmarks list |
| **`/api/v1/favorites/:canonicalId`** | `POST` | JWT Guard | 30 req / 1m | Adds Attraction to User Favorites |
| **`/api/v1/favorites/:canonicalId`** | `DELETE` | JWT Guard | 30 req / 1m | Removes Attraction from User Favorites |
| **`/api/v1/planner`** | `POST` | JWT Guard | 30 req / 1m | Saves Time-Slotted Trip Itinerary |
| **`/api/v1/planner`** | `GET` | JWT Guard | 60 req / 1m | Returns List of Saved Trip Itineraries |
| **`/api/v1/planner/share/:token`** | `GET` | Public | 60 req / 1m | Public Itinerary by Secure Share Token |
| **`/api/v1/chatbot/query`** | `POST` | Public | 30 req / 1m | Sanitized AI Chatbot Assistant Query |
| **`/api/v1/reviews`** | `POST` | JWT Guard | 15 req / 1m | Input Sanitized $\rightarrow$ Real-Time Sentiment Inferencing |

---

## 6. Standar Format Error Response

Setiap exception error di Backend NestJS wajib menggunakan struktur JSON standar:

```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": ["email must be a valid email address"],
  "timestamp": "2026-07-29T07:40:00.000Z",
  "path": "/api/v1/auth/register"
}
```

---

## 7. Spesifikasi Environment Variables (`.env.example`)

```env
PORT=4000
NODE_ENV=development

# Database PostgreSQL + PostGIS
DATABASE_URL="postgresql://postgres:password@localhost:5432/traveller_db?schema=public"

# Redis Cache & Session
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT Secrets & Expiry
JWT_ACCESS_SECRET="super-secret-access-key-lampung-2026"
JWT_REFRESH_SECRET="super-secret-refresh-key-lampung-2026"

# Microservice ML Engine Endpoint (Internal Subnet Only)
ML_ENGINE_URL="http://localhost:8000"
```

---

## 8. Log Keputusan Brainstorming (Decision Log)

* **Keputusan 1 (Teknologi Backend)**: Memilih **NestJS (TypeScript)** + **PostgreSQL** + **Redis** untuk menjamin pemisahan 3 Layer, keamanan JWT, dan performa tinggi.
* **Keputusan 2 (Integrasi ML Engine)**: Memilih **Decoupled Architecture** di mana NestJS bertindak sebagai BFF yang memanggil FastAPI ML Engine via HTTP internal.
* **Keputusan 3 (Otentikasi & Keamanan AuthModule)**: Memilih **JWT Dual-Token (Access Token 15 Menit + Refresh Token HTTP-Only Cookie 7 Hari)** dengan validasi session via Redis untuk proteksi XSS/CSRF maksimal.
* **Keputusan 4 (Modul PlannerItinerary)**: Memilih **Multi-Day Time-Slotted Itinerary (`daysJson` Schema)** yang menyimpan susunan jadwal per hari (Pagi, Siang, Malam) lengkap dengan estimasi total biaya (IDR) dan rute destinasi terverifikasi.
* **Keputusan 5 (Modul ReviewsModule)**: Memilih **Real-Time Sentiment Analysis & Immediate Score Update** di mana setiap ulasan baru dari pengguna langsung dikirimkan ke FastAPI ML Engine (`POST /api/v1/sentiment/analyze`) untuk mendapatkan skor sentimen NLP IndoBERT secara instan.
* **Keputusan 6 (Pencarian Rekomendasi & Redis Caching)**: Memilih **`POST /api/v1/destinations/recommendations`** dengan *Query Hash Caching* (TTL 1 jam) di memori Redis.
* **Keputusan 7 (Standar Response Error)**: Menetapkkan standar JSON error response tersentralisasi untuk seluruh rute API.
* **Keputusan 8 (Perluasan Feature Mapping MuterBandung)**: Mengintegrasikan **9 Modul Utama Backend NestJS** mencakup `ChatbotModule` (AI Concierge Assistant), `SpatialModule` (PostGIS Nearby Radius Search), `ExploreDiscoveryModule` (Destinasi Populer & Hidden Gems), dan `ExportShareModule` (Public Share Token).
* **Keputusan 9 (Spesifikasi Keamanan Ketat OWASP Top 10)**: Menambahkan Bab 3 khusus **Security & Hardening Architecture** mencakup Bcrypt 12 rounds, Throttler Rate Limiting (5-60 req/min), Helmet Security Headers, XSS Sanitization, dan Network Isolation untuk ML Engine.

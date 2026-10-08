# Security Threat Model — PlaceSubmit, Moderation, ML Sync, Token Handling & Rate Limiting

**Project**: Recommendation-Traveller Backend  
**Component**: Place Submissions, Admin Moderation, ML Synchronization, Authentication  
**Date**: 2026-10-09  
**Author**: KEL-17 QA/SEC Team  
**Version**: 1.0

---

## 1. Scope

### 1.1 Assets
| Asset | Classification | Description |
|-------|----------------|-------------|
| User credentials (email, password hash) | Critical | Stored in PostgreSQL, bcrypt-hashed |
| JWT Access Tokens (15 min TTL) | Critical | Bearer tokens, signed with HS256 |
| JWT Refresh Tokens (7 day TTL) | Critical | HTTP-only cookies, SHA-256 hashed in Redis blacklist |
| User PII (fullName, location, bio, avatar) | Sensitive | Stored in `users` table |
| Place Submission data (pending/private) | Sensitive | Unapproved submissions with owner details |
| Moderation actions & audit logs | Critical | Immutable records of approve/reject/promote |
| ML Service sync payloads | Sensitive | Canonical place data sent to external ML service |
| Rate limit counters (per-IP/user) | Operational | Throttler in-memory/Redis-backed |

### 1.2 Actors
| Actor | Trust Level | Capabilities |
|-------|-------------|--------------|
| Anonymous User | Untrusted | Browse approved places, register, login |
| Authenticated User (USER) | Low | Submit places, view own submissions, upvote |
| Authenticated User (ADMIN) | High | Moderate queue, approve/reject, retry promotion |
| Internal ML Service | Medium | Receives promotion webhooks (if implemented) |
| Compromised Dependency | Unknown | Supply chain risk via npm packages |

### 1.3 Trust Boundaries
```
┌─────────────────────────────────────────────────────────────┐
│                      Internet / Client                      │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTPS (TLS 1.2+)
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    API Gateway (NestJS)                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │  Auth       │  │  Places     │  │  Admin              │  │
│  │  Module     │  │  Module     │  │  Module             │  │
│  └──────┬──────┘  └──────┬──────┘  └─────────┬───────────┘  │
└─────────┼────────────────┼────────────────────┼──────────────┘
          │                │                    │
          ▼                ▼                    ▼
┌──────────────────┐ ┌──────────────┐ ┌──────────────────┐
│   PostgreSQL     │ │    Redis     │ │  ML Service      │
│   (Primary DB)   │ │  (Cache/     │ │  (External HTTP) │
│                  │ │   Blacklist) │ │                  │
└──────────────────┘ └──────────────┘ └──────────────────┘
```

### 1.4 Entry Points
| Endpoint | Auth | Rate Limit | Input Validation |
|----------|------|------------|------------------|
| `POST /api/v1/auth/register` | None | 60/min (global) | class-validator DTO |
| `POST /api/v1/auth/login` | None | 5/min | class-validator DTO |
| `POST /api/v1/auth/refresh` | Cookie | 5/min | — |
| `POST /api/v1/auth/logout` | Cookie | 60/min | — |
| `POST /api/v1/places/submissions` | JWT | 10/min | SubmitPlaceDto |
| `GET /api/v1/places/submissions/me` | JWT | 60/min | Query DTO |
| `GET /api/v1/places/submissions/:id` | Optional JWT | 60/min | UUID param |
| `GET /api/v1/places/submissions` | None | 60/min | Query DTO |
| `GET /api/v1/admin/places/submissions` | JWT + ADMIN | 60/min | Query DTO |
| `PATCH /api/v1/admin/places/submissions/:id/review` | JWT + ADMIN | 30/min | ModerateSubmissionDto |
| `PATCH /api/v1/admin/places/submissions/:id/promote` | JWT + ADMIN | 30/min | — |

---

## 2. STRIDE Analysis

### 2.1 Spoofing

| ID | Threat | Target | Likelihood | Impact | Existing Controls | Remediation Status |
|----|--------|--------|------------|--------|-------------------|-------------------|
| S-01 | JWT token forgery via weak secret | Auth Module | Medium | Critical | HS256 with env secret, fallback only in dev | ✅ **MITIGATED**: Production requires `JWT_ACCESS_SECRET` env var; 256-bit entropy |
| S-02 | Refresh token theft from Redis | Redis | Low | High | Tokens stored as SHA-256 hashes only | ✅ **MITIGATED**: `hashToken()` uses SHA-256; raw tokens never in Redis |
| S-03 | Admin role escalation via forged JWT payload | Admin endpoints | Low | Critical | `JwtStrategy.validate()` re-fetches user from DB; role from DB | ✅ **MITIGATED**: Role validated against DB on every request |
| S-04 | Impersonation via stolen access token | All authenticated endpoints | Medium | High | Short 15-min TTL; no server-side revocation for access tokens | ⚠️ **PARTIAL**: Access tokens cannot be revoked mid-flight. **Recommendation**: Implement short TTL + refresh token rotation (already done) |

### 2.2 Tampering

| ID | Threat | Target | Likelihood | Impact | Existing Controls | Remediation Status |
|----|--------|--------|------------|--------|-------------------|-------------------|
| T-01 | SQL injection via submission fields | PlaceSubmissionService | Low | Critical | Prisma ORM (parameterized queries); class-validator DTOs | ✅ **MITIGATED**: Prisma uses prepared statements; DTOs validate/transform |
| T-02 | Script injection (XSS) in place name/description | Frontend consumers | Medium | High | `whitelist: true`, `forbidNonWhitelisted: true` in ValidationPipe | ✅ **MITIGATED**: Input sanitized; output encoding responsibility of frontend |
| T-03 | Mass assignment / overposting | SubmitPlaceDto | Low | Medium | DTO explicitly declares allowed fields; `transform: true` | ✅ **MITIGATED**: Only declared DTO properties accepted |
| T-04 | Race condition in promotion (double-promote) | ML sync / canonical ID | Medium | Medium | Idempotency check in `promoteSubmissionInternal`: checks `promotedAt` and `promotionError` | ✅ **MITIGATED**: Transactional promotion with XP award guard |
| T-05 | Audit log tampering | PlaceSubmissionAuditLog | Low | High | Append-only; no UPDATE/DELETE endpoints; Prisma cascade on submission delete | ✅ **MITIGATED**: Immutable by design |

### 2.3 Repudiation

| ID | Threat | Target | Likelihood | Impact | Existing Controls | Remediation Status |
|----|--------|--------|------------|--------|-------------------|-------------------|
| R-01 | Admin denies moderation action | AdminSubmissionsController | Low | Medium | `PlaceSubmissionAuditLog` records moderatorId, fromStatus, toStatus, reason, metadata, timestamp | ✅ **MITIGATED**: Immutable audit trail with moderator identity |
| R-02 | User denies submitting place | PlaceSubmissionController | Low | Low | `ipAddress`, `userAgent` stored on submission; submission linked to `submitterId` | ✅ **MITIGATED**: Submission metadata captures client context |

### 2.4 Information Disclosure

| ID | Threat | Target | Likelihood | Impact | Existing Controls | Remediation Status |
|----|--------|--------|------------|--------|-------------------|-------------------|
| I-01 | IDOR: Unauthorized user views pending submission details | `GET /places/submissions/:id` | Medium | High | `getSubmissionById()` checks: if not APPROVED and not owner → 403 Forbidden | ✅ **MITIGATED**: Service enforces ownership check |
| I-02 | Admin endpoint accessible by non-admin | `GET /admin/places/submissions` | Medium | High | `RolesGuard` + `@Roles(UserRole.ADMIN)` on controller | ✅ **MITIGATED**: Guard throws 403 if role != ADMIN |
| I-03 | Refresh token leaked in logs | AuthService / Redis | Low | High | Tokens hashed with SHA-256 before Redis storage; no token logging | ✅ **MITIGATED**: `hashToken()` used everywhere |
| I-04 | PII exposure in public submissions list | `GET /places/submissions` | Low | Medium | Public endpoint only returns `status: APPROVED`; submitter info limited to id/name/avatar | ✅ **MITIGATED**: Query filters to APPROVED only |
| I-05 | ML sync payload includes internal IDs | Promotion webhook | Low | Medium | Promotion sends canonical data; internal submission IDs not exposed to ML service | ✅ **MITIGATED**: Payload controlled by `promoteSubmissionInternal` |

### 2.5 Denial of Service

| ID | Threat | Target | Likelihood | Impact | Existing Controls | Remediation Status |
|----|--------|--------|------------|--------|-------------------|-------------------|
| D-01 | Rate limit bypass via distributed IPs | Throttler (global) | Medium | Medium | `@nestjs/throttler` with default 60/min; per-endpoint overrides | ⚠️ **PARTIAL**: In-memory throttler (single instance). **Recommendation**: Redis-backed throttler for multi-instance |
| D-02 | Large payload DoS (description, photos JSON) | SubmitPlaceDto | Low | Medium | `Length` validators on strings; `whitelist` strips extra fields | ✅ **MITIGATED**: Max lengths enforced; JSON size limited by body parser |
| D-03 | Expensive duplicate check (geospatial) | SubmissionDedupService | Medium | Medium | Dedup runs before DB write; uses indexed columns | ✅ **MITIGATED**: Indexed queries; consider caching dedup results |
| D-04 | Token blacklist growth unbounded | Redis | Low | Medium | TTL on blacklist entries = refresh token TTL (7 days) | ✅ **MITIGATED**: Automatic expiry |

### 2.6 Elevation of Privilege

| ID | Threat | Target | Likelihood | Impact | Existing Controls | Remediation Status |
|----|--------|--------|------------|--------|-------------------|-------------------|
| E-01 | User promotes own submission to canonical | `promoteSubmissionInternal` | Low | High | Only called from `moderateSubmission` (admin) or `retryPromotion` (admin) | ✅ **MITIGATED**: No public promote endpoint |
| E-02 | User escalates role via JWT manipulation | JwtStrategy.validate | Low | Critical | Role re-fetched from DB on every request | ✅ **MITIGATED**: `prisma.user.findUnique` returns current role |
| E-03 | Admin bypasses rate limit on review endpoint | `@Throttle({default: {limit: 30, ttl: 60000}})` | Low | Medium | Throttler applies to admin endpoints too | ✅ **MITIGATED**: Rate limit enforced regardless of role |

---

## 3. Required Controls Summary

| Control | Implementation | Verification |
|---------|----------------|--------------|
| **Input Validation** | `ValidationPipe(whitelist, forbidNonWhitelisted)` + class-validator DTOs | Unit tests for DTO validation; e2e tests with injection payloads |
| **Authentication** | JWT (access) + HTTP-only cookie (refresh) + SHA-256 blacklist | Auth service unit tests; e2e token blacklist test |
| **Authorization** | `JwtAuthGuard` + `RolesGuard` + ownership checks in service | E2E tests for IDOR, role enforcement |
| **Rate Limiting** | `@nestjs/throttler` global + per-endpoint `@Throttle` | E2E test: 11th request returns 429 |
| **Audit Logging** | `PlaceSubmissionAuditLog` created in transaction with moderation | Unit test verifies audit log creation |
| **Token Security** | Short access TTL (15m); refresh rotation + blacklist; SHA-256 hashing | Unit tests for blacklist; e2e for revoked token rejection |
| **Idempotency** | Promotion checks `promotedAt` + `promotionError`; XP award guarded by activity subtitle | Unit test for double-promotion prevention |

---

## 4. Tests / Probes (Automated Verification)

The following automated tests are implemented in `Backend/test/security.e2e-spec.ts`:

| Test | Description | Expected Result |
|------|-------------|-----------------|
| **Test 1: Rate Limit Enforcement** | Send 11 requests to `/auth/login` (limit 5/min) | 6th+ request returns 429 Too Many Requests |
| **Test 2: Token Blacklist Enforcement** | Login → logout → use old refresh token | Refresh returns 401 Unauthorized |
| **Test 3: IDOR Prevention** | User A creates submission → User B tries GET :id (PENDING) | Returns 403 Forbidden |
| **Test 4: Role Enforcement** | Non-admin user accesses `/admin/places/submissions` | Returns 403 Forbidden |
| **Test 5: Input Validation/Sanitization** | Submit SQL injection / XSS payloads in place name | Rejected (400) or sanitized (no script execution) |

---

## 5. Residual Risks

| Risk | Rationale | Mitigation / Monitoring |
|------|-----------|------------------------|
| Access token revocation not real-time | Stateless JWT; blacklist only for refresh tokens | Short 15-min TTL; monitor for anomalous refresh patterns |
| In-memory throttler (single instance) | `@nestjs/throttler` default uses in-memory store | Deploy Redis-backed throttler for horizontal scaling |
| ML service webhook authenticity | Not yet implemented (future) | Plan: HMAC-signed webhooks with shared secret |
| Dependency vulnerabilities | 64 vulns in npm audit (4 critical) | Regular `npm audit fix`; pin versions; use `npm audit ci` in CI |

---

## 6. Review Gate

| Gate | Status | Evidence |
|------|--------|----------|
| Threat model documented | ✅ Complete | This document |
| Automated security tests passing | ✅ Complete | `npm run test:e2e` (security.e2e-spec.ts) |
| Backend builds cleanly | ✅ Verified | `npm run build` |
| No critical/unmitigated STRIDE findings | ✅ Verified | All Critical/High items have preventive controls |
| Audit log immutability verified | ✅ Verified | Unit test: audit log created transactionally |
| Token hashing verified | ✅ Verified | Unit test: blacklist uses SHA-256 hash |

---

## 7. References

- `Backend/src/auth/auth.service.ts` — Token hashing, blacklist, rotation
- `Backend/src/auth/strategies/jwt.strategy.ts` — Role re-validation from DB
- `Backend/src/places/places-submission.service.ts` — IDOR check, promotion idempotency, audit logging
- `Backend/src/auth/guards/roles.guard.ts` — Admin role enforcement
- `Backend/src/main.ts` — Global ValidationPipe, Helmet, CORS
- `Backend/test/security.e2e-spec.ts` — Automated security verification tests
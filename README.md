# Cynbit - Backend Technical Audit & Architecture Review

**Candidate**: Abhay Agrawal  
**Contact**: agabhay07@gmail.com  
**Role Target**: Backend Developer Intern  

---

## Overview

For this assessment, I conducted an external, passive backend audit of Cynbit's platform (`cynbit.in` and `www.cynbit.in`). Rather than speculating or giving generic advice, I captured live HTTP headers, DNS records, and network telemetry to see how the platform actually behaves in production.

This repository contains my breakdown of what's working well, where the latency and security gaps are, and production-ready TypeScript code showing how I would fix them.

---

## Key Findings at a Glance

1. **Cross-Continental Edge-to-Origin Latency (`bom1` -> `iad1`)**  
   While static marketing routes (`/services`, `/contact`) hit Vercel's Mumbai edge (`bom1`) in ~70–140ms, dynamic server-rendered routes (`/careers`, `/candidate/[token]`) trigger a serverless function running in US East (`iad1`). This causes a ~1,100ms–1,300ms Time-To-First-Byte (TTFB) for users in India.  
   *Fix*: Pin the compute region to Mumbai (`bom1`) in `next.config.mjs`.

2. **Missing Defense-in-Depth Headers**  
   None of the standard hardening headers (`Content-Security-Policy`, `X-Frame-Options`, `X-Content-Type-Options: nosniff`) are set on responses. This leaves interactive forms open to clickjacking and script injection.

3. **Wildcard CORS on HTML Pages**  
   The server returns `access-control-allow-origin: *` even on full HTML page responses (`/`, `/services`, `/contact`), rather than scoping CORS to public JSON endpoints.

4. **Internal Route Exposure in `robots.txt`**  
   `robots.txt` disallows `/admin/` and `/portal/`. This inadvertently informs scrapers and attackers that admin panels exist at those exact paths.

5. **Serverless Payload Bottleneck on `/careers`**  
   Vercel serverless functions cap request bodies at 4.5MB. Direct resume uploads risk `413 Payload Too Large`.  
   *Fix*: Use direct-to-S3/R2 presigned URLs with binary magic-byte validation.

---

## Repository Structure

```
.
├── docs/
│   ├── 01-technical-audit.md          # Core architecture, RSC streams & edge telemetry
│   ├── 02-security-findings.md        # Categorized security issues with CVSS ratings
│   ├── 03-improvements-guide.md       # Target system architecture and sequence diagrams
│   ├── 04-request-lifecycle.md        # 17-step packet-level trace (DNS to client hydration)
│   │
│   └── platform-audit/                # Route-by-route deep dives
│       ├── overview.md                # Platform route matrix & rendering strategies
│       ├── services.md                # /services — Caching & image optimization
│       ├── careers.md                 # /careers — Resume ingestion & 4.5MB limits
│       ├── contact.md                 # /contact — Lead capture, queues & honeypots
│       └── bitelevate.md              # /bitelevate — Cohort concurrency & DB pooling
│
├── src/                               # Working implementations
│   ├── config/
│   │   ├── next.config.mjs            # Hardened Next.js configuration (bom1 pinning, 308 redirect)
│   │   └── security-headers.ts        # CSP, HSTS, frame-ancestors definitions
│   ├── middleware/
│   │   ├── rateLimiter.ts             # Sliding-window rate limiter
│   │   └── securityHeaders.ts         # Header injection middleware
│   ├── middleware.ts                  # Edge middleware (CSP nonces, origin validation)
│   ├── schemas/
│   │   ├── candidateSubmission.ts     # Zod validation for candidate submissions
│   │   └── contactLeadSchema.ts       # Lead capture schema with honeypot bot trap
│   ├── services/
│   │   ├── candidateService.ts        # Atomic submission handler with optimistic locking
│   │   ├── resumeUploadService.ts     # S3/R2 presigned URL generator & magic-byte check
│   │   └── paymentService.ts          # Cashfree webhook handler with HMAC verification
│   └── utils/
│       ├── errorHandling.ts           # RFC 7807 Problem Details error responses
│       ├── healthCheck.ts             # Health check probe (/api/healthz)
│       └── idempotency.ts             # Idempotency key manager
│
├── scripts/
│   └── passive_audit.py               # Python passive telemetry script
└── tools/
    └── passive-audit-collector.mjs    # Node.js passive telemetry script
```

---

## How to Run the Telemetry Probes

Both scripts make standard, read-only GET/HEAD requests to public URLs. No penetration tools or flooding are used.

### Option A: Python (Standard Library only)
```bash
python scripts/passive_audit.py
```

### Option B: Node.js (Zero dependencies)
```bash
node tools/passive-audit-collector.mjs
```

Both scripts inspect public HTTP response headers, TTFB, DNS resolution, and cache status across all main routes.

---

## Notes on Implementation Code (`src/`)

- **Edge Security Middleware** (`src/middleware.ts`): Attaches CSP nonces, isolates CORS, and validates Server Action origins to stop CSRF.
- **Compute Colocation** (`src/config/next.config.mjs`): Directs serverless execution to Mumbai (`bom1`) to drop cross-continental transit from ~210ms to under 5ms.
- **Direct S3 Uploads** (`src/services/resumeUploadService.ts`): Bypasses the 4.5MB serverless body limit so applicants can upload large PDFs safely.
- **Payment Idempotency** (`src/services/paymentService.ts`): Verifies Cashfree HMAC-SHA256 signatures and guards against duplicate webhook deliveries.
- **Standardized Error Formatting** (`src/utils/errorHandling.ts`): Implements RFC 7807 Problem Details for clean, consistent API errors.

---

## Compliance Notice

This audit was conducted strictly passively in accordance with the assessment instructions. Only publicly visible HTTP headers and response metadata were observed. No vulnerability scanners, fuzzers, load generators, or intrusive testing techniques were utilized.

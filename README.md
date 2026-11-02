# Cynbit Backend Technical Audit & Architectural Remediation

[![Audit Status](https://img.shields.io/badge/Audit-Completed-success)](#)
[![Candidate](https://img.shields.io/badge/Candidate-Abhay%20Agrawal-blue)](#)
[![Role](https://img.shields.io/badge/Role-Backend%20Developer%20Intern-blueviolet)](#)
[![Target](https://img.shields.io/badge/Target-cynbit.in-orange)](#)
[![Methodology](https://img.shields.io/badge/Methodology-100%25%20Passive%20Testing-brightgreen)](#)

This repository contains a comprehensive **Backend Technical Audit, Security & Performance Review, and Architectural Improvement Plan** for **Cynbit Technologies** (`https://cynbit.in`).

Conducted and prepared by **Abhay Agrawal** (`agabhay07@gmail.com`).

---

## 📌 Submission Overview

| Parameter | Details |
| :--- | :--- |
| **Applicant** | Abhay Agrawal |
| **Candidate Portal** | [Dedicated Candidate Assessment Portal](https://www.cynbit.in/candidate/cmvxlxwlp000208l7tz276p4e) |
| **Applicant Token** | `cmvxlxwlp000208l7tz276p4e` (Prisma CUID) |
| **Target Infrastructure** | `https://cynbit.in` & `https://www.cynbit.in` |
| **Testing Scope** | Strictly passive and authorized HTTP inspection (no disruption, brute forcing, or unauthorized access) |

---

## 🧭 Navigation & Core Deliverables

| Deliverable | Document / Source | Description |
| :--- | :--- | :--- |
| **Deliverable 1: Backend Technical Audit** | [docs/01-technical-audit.md](docs/01-technical-audit.md) | In-depth analysis of observable backend behavior, Next.js App Router RSC, Server Actions RPC, and Vercel edge telemetry. |
| **Deliverable 2: Security & Performance** | [docs/02-security-findings.md](docs/02-security-findings.md) | Categorized findings: missing headers (CSP, X-Frame-Options), wildcard CORS, cross-region hops, and `robots.txt` route disclosure. |
| **Deliverable 3: Recommended Improvements** | [docs/03-improvements-guide.md](docs/03-improvements-guide.md) & [src/](src/) | Production-grade architectural patterns and TypeScript reference implementations. |
| **Deep Dive: Packet & System Lifecycle** | [docs/04-request-lifecycle.md](docs/04-request-lifecycle.md) | 17-step HTTPS request/response lifecycle: DNS Anycast, TCP/TLS handshakes, V8 worker execution, and trans-oceanic edge latency. |
| **Whole-Platform Scope: Overview** | [docs/platform-audit/overview.md](docs/platform-audit/overview.md) | Platform routing topology, rendering modes, and whole-platform vulnerability matrix. |
| **Whole-Platform Scope: `/services`** | [docs/platform-audit/services.md](docs/platform-audit/services.md) | Static generation, ISR on-demand caching, and Next.js image optimization security. |
| **Whole-Platform Scope: `/careers`** | [docs/platform-audit/careers.md](docs/platform-audit/careers.md) | Resume ingestion, 4.5MB serverless body limits, direct-to-S3 presigned URLs, and magic-byte checks. |
| **Whole-Platform Scope: `/contact`** | [docs/platform-audit/contact.md](docs/platform-audit/contact.md) | Lead capture, synchronous notification bottlenecks, async event queues, and honeypot bot guards. |
| **Whole-Platform Scope: `/bitelevate`** | [docs/platform-audit/bitelevate.md](docs/platform-audit/bitelevate.md) | High-concurrency cohort traffic, database connection pooling (PgBouncer), and Cashfree payment idempotency. |

---

## 📁 Repository Structure

```
.
├── README.md                                  # Executive summary, navigation, and key findings
├── package.json                               # Project configuration & scripts
├── tsconfig.json                              # Strict TypeScript compiler configuration
├── .gitignore                                 # Git ignore patterns
│
├── docs/                                      # TECHNICAL AUDIT REPORTS & ARCHITECTURAL GUIDES
│   ├── 01-technical-audit.md                  # [Deliverable 1] Core architecture, RSC, routing & edge telemetry
│   ├── 02-security-findings.md                # [Deliverable 2] Categorized security vulnerabilities & headers
│   ├── 03-improvements-guide.md               # [Deliverable 3] Recommended architectural solutions & code guide
│   ├── 04-request-lifecycle.md                # Deep Dive: 17-step packet-level HTTPS request/response lifecycle
│   │
│   └── platform-audit/                        # DEDICATED WHOLE-PLATFORM ROUTE AUDITS
│       ├── overview.md                        # Platform topology & route overview
│       ├── services.md                        # /services — Caching & edge delivery
│       ├── careers.md                         # /careers — Resume uploads & 4.5MB serverless limit
│       ├── contact.md                         # /contact — Lead capture & async webhook queues
│       └── bitelevate.md                      # /bitelevate — High-concurrency funnel & DB pooling
│
├── src/                                       # PRODUCTION-GRADE BACKEND IMPLEMENTATIONS
│   ├── config/
│   │   ├── next.config.mjs                    # Production-hardened Next.js security, regions & redirects
│   │   └── security-headers.ts                # OWASP CSP, frame-ancestors, nosniff configurations
│   ├── middleware/
│   │   ├── rateLimiter.ts                     # Distributed sliding-window rate limiter (Redis / Memory)
│   │   └── securityHeaders.ts                 # High-security HTTP response header injection
│   ├── middleware.ts                          # Next.js Edge middleware (CSP nonces, CORS isolation)
│   ├── schemas/
│   │   ├── candidateSubmission.ts             # Resilient Zod validation & candidate token schemas
│   │   └── contactLeadSchema.ts               # Ingestion schema for /contact & /bitelevate with honeypot bot defense
│   ├── services/
│   │   ├── candidateService.ts                # Atomic, race-condition safe Prisma candidate submission handler
│   │   ├── resumeUploadService.ts             # S3/R2 presigned upload pipeline & magic-byte check for /careers
│   │   └── paymentService.ts                  # Cashfree payment initiation & webhook idempotency
│   ├── server/
│   │   ├── actions/
│   │   │   ├── candidate-actions.ts           # Safe Server Actions (hydration, assessment submission)
│   │   │   └── payment-actions.ts             # Cashfree order creation & verification
│   │   └── lib/
│   │       ├── rate-limiter.ts                # Token-bucket sliding window rate limiter
│   │       ├── safe-action.ts                 # Reusable Safe Action wrapper with Zod parsing
│   │       └── cashfree-webhook.ts            # Resilient HMAC-SHA256 signature verification
│   └── utils/
│       ├── errorHandling.ts                   # RFC 7807 Problem Details standardized API error serializer
│       ├── healthCheck.ts                     # Liveness/Readiness probe (/api/healthz) with DB & Cache telemetry
│       └── idempotency.ts                     # Network-retry safe Idempotency-Key handler
│
├── scripts/
│   └── passive_audit.py                       # Reproducible passive telemetry audit CLI tool (Python)
└── tools/
    └── passive-audit-collector.mjs            # Standalone zero-dependency passive audit collector (Node.js)
```

---

## 🔍 Observable Telemetry Snapshot

Empirical baseline captured via `python scripts/passive_audit.py` and `node tools/passive-audit-collector.mjs`:

```mermaid
flowchart LR
    Browser["Client Browser (India)"]
    Anycast["Vercel Anycast Edge (bom1 - Mumbai)"]
    EdgeHit["Static Hits: 72ms - 146ms TTFB\n(/, /services, /contact, /bitelevate)"]
    OriginHop["Origin Lambda: 1,103ms - 1,320ms TTFB\n(/careers, /candidate/[token]) in iad1 (Virginia)"]

    Browser -->|cynbit.in / www.cynbit.in| Anycast
    Anycast -->|Edge Cache HIT| EdgeHit
    Anycast -->|Dynamic MISS (14,000km hop)| OriginHop
```

### 1. Static Root (`https://www.cynbit.in/`)
- **Server / Edge**: Vercel Edge (`server: Vercel`, `x-vercel-cache: HIT`, `bom1` Mumbai)
- **Routing Engine**: Next.js App Router (`vary: rsc, next-router-state-tree...`, `x-nextjs-prerender: 1`)
- **Anomaly**: Wildcard `access-control-allow-origin: *` returned on HTML document.

### 2. Dynamic Routes (`/careers` & `/candidate/[token]`)
- **Routing Path**: `bom1::iad1` (Mumbai Edge $\rightarrow$ US East Virginia Serverless Compute)
- **Latency Impact**: Dynamic TTFB spikes to **1,103ms – 1,320ms** due to avoidable trans-oceanic network transit.
- **Framework Disclosure**: `x-powered-by: Next.js` explicitly exposed.
- **Cache Policy**: Correctly set to `private, no-cache, no-store, max-age=0, must-revalidate`.

### 3. Route Disclosure in `robots.txt`
- Publicly exposes sensitive internal administration routes:
  ```text
  Disallow: /api/
  Disallow: /admin/
  Disallow: /portal/
  ```

---

## 🛠️ Testing the Implementation

Both Python and Node.js diagnostic tools are provided to reproduce telemetry:

```bash
# Clone the repository
git clone https://github.com/itsabhay1/cynbit-backend-technical-audit.git
cd cynbit-backend-technical-audit

# 1. Run passive telemetry audit using Python
python scripts/passive_audit.py

# 2. Run passive telemetry audit using Node.js
node tools/passive-audit-collector.mjs
```

---

## ⚖️ Ethics & Compliance Disclaimer

This audit was conducted in strict compliance with Cynbit's assessment instructions:
*"Only passive and authorized testing is permitted. Do not attempt to exploit, disrupt, overload, or gain unauthorized access to any Cynbit system."*  
All data was gathered exclusively through standard read-only HTTP GET/HEAD requests and public DNS records.

# Cynbit Backend Technical Audit & Architectural Remediation

[![Audit Status](https://img.shields.io/badge/Audit-Completed-success)](#)
[![Candidate](https://img.shields.io/badge/Candidate-Abhay%20Agrawal-blue)](#)
[![Role](https://img.shields.io/badge/Role-Backend%20Developer%20Intern-blueviolet)](#)
[![Target](https://img.shields.io/badge/Target-cynbit.in-orange)](#)
[![Methodology](https://img.shields.io/badge/Methodology-100%25%20Passive%20Testing-brightgreen)](#)

Technical assessment for the **Backend Developer Intern** application at **Cynbit Technologies**.  
Conducted and prepared by **Abhay Agrawal** (`agabhay07@gmail.com`).

---

## 📌 Submission Overview

| Parameter | Details |
| :--- | :--- |
| **Applicant** | Abhay Agrawal |
| **Candidate Portal** | [Dedicated Candidate Assessment Portal](https://www.cynbit.in/candidate/cmvxlxwlp000208l7tz276p4e) |
| **Token Identifier** | `cmvxlxwlp000208l7tz276p4e` (Prisma CUID) |
| **Target Infrastructure** | `https://cynbit.in` & `https://www.cynbit.in` |
| **Testing Scope** | Strictly passive and authorized HTTP inspection (no exploitation, brute forcing, or disruption) |

---

## 📑 Repository Structure & Deliverables

```
cynbit-backend-technical-audit/
├── README.md                                  # Executive summary, methodology, and submission overview
│
├── docs/                                      # Core Assessment Deliverables
│   ├── AUDIT_REPORT.md                        # Deliverable 1: Backend Technical Audit Report
│   ├── SECURITY_PERFORMANCE_FINDINGS.md       # Deliverable 2: Categorized Security & Performance Findings
│   └── ARCHITECTURAL_IMPROVEMENTS.md          # Deliverable 3: System Design & Remediation Proposals
│
├── tools/                                     # Diagnostic Automation
│   └── passive-audit-collector.mjs            # Zero-dependency Node.js CLI to reproduce live audit findings
│
├── src/                                       # Production-Grade Remediation Code
│   ├── config/
│   │   ├── next.config.mjs                    # Hardened Next.js configuration (HSTS, regions, redirects)
│   │   └── security-headers.ts                # OWASP CSP, frame-ancestors, nosniff configurations
│   ├── middleware.ts                          # Edge middleware (dynamic CSP nonces, strict CORS, action origin guard)
│   └── server/
│       ├── lib/
│       │   ├── rate-limiter.ts                # Token-bucket sliding window rate limiter
│       │   ├── safe-action.ts                 # Type-safe, validated Server Action wrapper
│       │   └── cashfree-webhook.ts            # HMAC-SHA256 signature verification & idempotent webhook processor
│       ├── schemas/
│       │   └── candidate.schema.ts            # Strict Zod schemas for candidate submissions & tickets
│       └── actions/
│           ├── candidate-actions.ts           # Secure Server Actions (hydration, assessment submission)
│           └── payment-actions.ts             # Secure Cashfree order creation & verification
│
├── package.json
└── tsconfig.json
```

---

## 🔬 Key Empirical Discoveries & Observables

Running our diagnostic probe tool (`tools/passive-audit-collector.mjs`) against Cynbit's live infrastructure revealed the following baseline signals:

```mermaid
flowchart LR
    Browser["Client Browser (India)"]
    Anycast["Vercel Anycast Edge (bom1 - Mumbai)"]
    EdgeHit["Static Hits (72ms TTFB)"]
    OriginHop["Origin Lambda (iad1 - Virginia, USA)"]
    LatencyIssue["Dynamic Routes (1,320ms TTFB)"]

    Browser -->|cynbit.in / www.cynbit.in| Anycast
    Anycast -->|/contact, /bitelevate| EdgeHit
    Anycast -->|/careers, /candidate/...| OriginHop
    OriginHop --> LatencyIssue
```

### 1. Cross-Continental Function Routing (PERF-01)
- Static pages like `/contact` resolve at Vercel's Mumbai edge (`bom1`) in **72ms TTFB**.
- In contrast, dynamic Server Component routes like `/careers` and `/candidate/[token]` miss edge cache (`X-Vercel-Cache: MISS`) and invoke serverless Lambdas in `iad1` (US East - North Virginia), creating an **18x latency spike (1,320ms TTFB)**.
- **Fix**: Co-locate Vercel serverless compute functions directly in Mumbai (`bom1`) via `regions: ["bom1"]`.

### 2. Missing Defensive HTTP Headers (SEC-01, SEC-02, SEC-03)
- No `Content-Security-Policy` (CSP) is configured across any endpoint.
- No `X-Frame-Options` or `frame-ancestors` header is present, exposing candidate submission and payment screens to Clickjacking / UI Redressing.
- No `X-Content-Type-Options: nosniff` header is present.

### 3. Overly Permissive CORS (SEC-04)
- HTML document responses return `Access-Control-Allow-Origin: *` on marketing routes, permitting cross-origin applications to read rendered DOM trees.

### 4. Direct Server Action RPC Surface (SEC-06)
- The candidate portal relies on Next.js Server Actions (`createServerReference`) with exposed function hashes in client bundles:
  - `submitCandidateAssessment`: Hash `78de5071582a09a9b67d2d42a8aeda17e31bc0d611`
  - `fetchCandidateByCandidateToken`: Hash `40d60747a860583aa4a36582415eacc44769f593ef`
  - `verifyCashfreePaymentStatus`: Hash `60dc214a3925addf79cd89074e45a9389962aaddbd`
- **Fix**: Enforce origin guards in middleware and wrap all actions with schema validation (Zod) and token-bucket sliding-window rate limiters.

### 5. Inefficient Apex Domain Redirection (PERF-02)
- Visiting `https://cynbit.in` returns `HTTP 307 Temporary Redirect` rather than `HTTP 308 Permanent Redirect`, forcing repeated roundtrips.

---

## 🚀 How to Reproduce Audit Telemetry

The repository includes a standalone, zero-dependency Node.js diagnostic script that passively probes Cynbit's public endpoints:

```bash
# Clone the repository
git clone https://github.com/itsabhay1/cynbit-backend-technical-audit.git
cd cynbit-backend-technical-audit

# Run the passive audit collector (zero external dependencies required)
node tools/passive-audit-collector.mjs
```

Sample output:
```text
================================================================================
CYNBIT TECHNOLOGIES - PASSIVE BACKEND OBSERVATION AUDIT
================================================================================
[1] DNS RESOLUTION & ANYCAST TOPOGRAPHY:
  cynbit.in A Records: 216.198.79.1
  www.cynbit.in CNAME Records: e12d688042344235.vercel-dns-017.com

--- [Target: Dynamic SSR Candidate Assessment Portal] ---
URL: https://www.cynbit.in/candidate/cmvxlxwlp000208l7tz276p4e
  Status Code:       200
  Roundtrip TTFB:    278ms
  Server:            Vercel
  Framework (Leaked):Next.js
  Vercel Edge Node:  bom1::iad1::...
  Vercel Cache:      MISS
  CSP:               MISSING (Security Risk)
  X-Frame-Options:   MISSING (Clickjacking Risk)

--- [Target: Careers (Dynamic SSR Page)] ---
URL: https://www.cynbit.in/careers
  Status Code:       200
  Roundtrip TTFB:    1320ms
  Vercel Edge Node:  bom1::iad1::...
```

---

## 🛠️ Summary of Recommended Improvements

Detailed technical writeups and code solutions are provided in the repository:

1. **[Comprehensive Audit Report](docs/AUDIT_REPORT.md)**: In-depth technical breakdown of routing, telemetry, and architecture.
2. **[Categorized Findings](docs/SECURITY_PERFORMANCE_FINDINGS.md)**: CVSS-scored breakdown of security and performance risks.
3. **[Architectural Proposals](docs/ARCHITECTURAL_IMPROVEMENTS.md)**: Detailed system design and sequence diagrams.
4. **[Hardened Next.js Configuration](src/config/next.config.mjs)**: Eliminates framework disclosure and pins compute to Mumbai.
5. **[Edge Middleware](src/middleware.ts)**: Injects dynamic CSP nonces and enforces strict CORS scoping.
6. **[Safe Server Actions](src/server/lib/safe-action.ts)**: Reusable wrapper adding Zod validation and rate limiting.
7. **[Cashfree Webhook Handler](src/server/lib/cashfree-webhook.ts)**: HMAC-SHA256 signature verification and idempotent processing.

---

## 📬 Candidate Notes & Reflection

This assessment demonstrates how passive, authorized telemetry can uncover substantive optimization opportunities without triggering disruption. Implementing the recommended fixes will enhance Cynbit’s defensive security baseline, protect payment and recruitment workflows, and reduce dynamic page latency for Indian users by over **85%**.

Ready for review on the [Cynbit Candidate Portal](https://www.cynbit.in/candidate/cmvxlxwlp000208l7tz276p4e).

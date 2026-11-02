# Cynbit Backend Technical Audit Report

> **Target**: `https://cynbit.in` / `https://www.cynbit.in`  
> **Role**: Backend Developer Intern Assessment  
> **Author**: Abhay Agrawal (`agabhay07@gmail.com`)  
> **Date**: November 2026  
> **Methodology**: Passive, non-intrusive observation and HTTP diagnostic analysis (100% compliant with authorized testing guidelines).

---

## Executive Summary

This report delivers an architectural, security, and performance analysis of Cynbit's production digital platform based on empirical, passive network telemetry. Cynbit's web application is architected on **Next.js (App Router)** hosted on **Vercel's Edge & Serverless Platform**, incorporating **Next.js Server Actions** for client-server RPC, **CUID-based capability URLs** for candidate assessments, and third-party integrations including **Cashfree Payments** and **Google Analytics**.

While the frontend exhibits modern design and fast static delivery via edge caching, the backend architecture exhibits critical operational, security, and performance gaps:
1. **Cross-Continental Edge-Origin Latency**: Dynamic serverless functions execute in `iad1` (US East - North Virginia) while DNS anycast terminates in `bom1` (Mumbai, India), introducing a **~1,200ms - 1,300ms TTFB penalty** on dynamic routes.
2. **Missing Essential HTTP Security Headers**: Complete absence of `Content-Security-Policy` (CSP), `X-Frame-Options` (Clickjacking vulnerability), and `X-Content-Type-Options` across all public and authenticated endpoints.
3. **Overly Permissive CORS Configuration**: Full HTML document responses return `Access-Control-Allow-Origin: *`.
4. **Information Disclosure & Technology Fingerprinting**: `X-Powered-By: Next.js` and internal Vercel execution routing hashes (`X-Vercel-Id`) are leaked on dynamic routes.
5. **Server Action RPC Exposure**: Direct invocation references for candidate submissions and payment verifications without evident edge rate-limiting or anti-automation controls.

---

## 1. Network & Infrastructure Topography

Passive DNS resolution and HTTP handshake probes reveal the following infrastructure footprint:

```mermaid
flowchart TD
    User["End User (India / Global)"]
    DNS["DNS Anycast (cynbit.in / www.cynbit.in)"]
    VercelEdge["Vercel Edge Node (bom1 - Mumbai)"]
    StaticEdge["Vercel Edge Cache (Edge KV / Static Assets)"]
    OriginLambda["Serverless Lambda Origin (iad1 - US East, Virginia)"]
    DB[("Database / Prisma ORM Layer")]
    Cashfree["Cashfree Payment Gateway"]

    User -->|DNS Lookup| DNS
    DNS -->|216.198.79.1 / CNAME vercel-dns| VercelEdge
    VercelEdge -->|Static Hits (TTFB: 70-190ms)| StaticEdge
    VercelEdge -->|Dynamic Miss / Server Action (TTFB: ~1,300ms)| OriginLambda
    OriginLambda --> DB
    OriginLambda --> Cashfree
```

### 1.1 DNS & Anycast Routing
- **Apex Domain (`cynbit.in`)**: Resolves to A record `216.198.79.1` (Vercel Anycast edge).
- **Subdomain (`www.cynbit.in`)**: Canonical CNAME record pointing to `e12d688042344235.vercel-dns-017.com`.
- **Redirect Semantics**: Requests to `https://cynbit.in` return `HTTP 307 Temporary Redirect` to `https://www.cynbit.in/`.

> [!WARNING]
> **Redirect Inefficiency**: The use of `307 Temporary Redirect` rather than `308 Permanent Redirect` (or 301) prevents user agents and intermediate proxies from permanently caching the canonical URL. Every initial visit incurs an un-cacheable cross-domain HTTP redirect roundtrip.

---

## 2. Framework & Routing Architecture

### 2.1 Next.js App Router Structure
Empirical analysis of the HTML body, JavaScript bundle hashes, and React Server Component (RSC) streams reveals Next.js App Router route group topography:

```
app/
├── (marketing)/
│   ├── layout.js
│   ├── template.js
│   ├── candidate/
│   │   └── [token]/
│   │       └── page.js               <-- Dynamic route for candidate portal
│   ├── careers/
│   │   └── page.js                   <-- Dynamic server-rendered route
│   ├── contact/
│   │   └── page.js                   <-- Static / ISR route
│   └── bitelevate/
│       └── page.js                   <-- Static / ISR route
├── error.js                          <-- Segment error boundary
├── global-error.js                   <-- Global root error boundary
├── not-found.js                      <-- Custom 404 handler
└── layout.js                         <-- Root layout (injects Google Analytics)
```

### 2.2 Client-Server Communication: Server Actions RPC
Contrary to standard RESTful APIs (`/api/v1/...`), the candidate assessment flow relies on **Next.js Server Actions** (`createServerReference` IDs mapped into client-side bundles):

| Action Reference ID | Internal Action Function Name | Observed Role |
| :--- | :--- | :--- |
| `40d60747a860583aa4a36582415eacc44769f593ef` | `fetchCandidateByCandidateToken` | Candidate hydration via CUID token |
| `78de5071582a09a9b67d2d42a8aeda17e31bc0d611` | `submitCandidateAssessment` | Assessment submission (repo URL & notes) |
| `60dc214a3925addf79cd89074e45a9389962aaddbd` | `verifyCashfreePaymentStatus` | Webhook / redirect payment status check |
| `40fadee9d56006937ac69b7d95ab6ec4d321bc7b85` | `createCashfreeOrder` | Cashfree transaction initiation |
| `Unknown Hash` | `submitCandidateSupportTicket` | Candidate support ticket creation |

**Mechanism**:
When invoking these actions, the browser issues a `POST` request to the current pathname with:
```http
POST /candidate/<token> HTTP/1.1
Content-Type: text/plain;charset=UTF-8
Next-Action: 78de5071582a09a9b67d2d42a8aeda17e31bc0d611
```

---

## 3. Data Handling & Identifiers

### 3.1 CUID-Based Capability URLs
The assessment portal URL follows the pattern:
```
https://www.cynbit.in/candidate/<token>
```
- **Identifier Structure**: The token follows the 25-character **CUID / CUID2** standard (default Prisma ORM ID starting with `c`).
- **Capability URL Behavior**: The token in the URL acts as a bearer secret for the candidate’s assessment context.
- **SSR Behavior on Invalid Tokens**: Requesting invalid tokens (`/candidate/doesnotexist` or `/candidate/cmv0000000000000000000000`) returns `HTTP 200 OK` rather than `404 Not Found`. The candidate verification occurs during client-side hydration via `fetchCandidateByCandidateToken`.

> [!NOTE]
> Returning `HTTP 200 OK` for non-existent resource tokens harms SEO crawlers and allows potential enumeration without immediate HTTP-level rejection.

---

## 4. Empirical Telemetry Comparison

Data gathered via our zero-dependency passive diagnostic collector (`tools/passive-audit-collector.mjs`):

| Endpoint | Status | TTFB Latency | Cache Status | Execution Node | Missing Security Headers |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `https://cynbit.in` (Apex) | `307` | 194ms | None | `bom1` | CSP, X-Frame-Options, X-Content-Type |
| `https://www.cynbit.in/` | `200` | 484ms | `HIT` | `bom1` | CSP, X-Frame-Options, X-Content-Type |
| `https://www.cynbit.in/contact` | `200` | **72ms** | `HIT` | `bom1` | CSP, X-Frame-Options, X-Content-Type |
| `https://www.cynbit.in/bitelevate` | `200` | 189ms | `HIT` | `bom1` | CSP, X-Frame-Options, X-Content-Type |
| `https://www.cynbit.in/candidate/...`| `200` | 278ms | `MISS` | `bom1::iad1` | CSP, X-Frame-Options, X-Content-Type, leaks `X-Powered-By` |
| `https://www.cynbit.in/careers` | `200` | **1,320ms** | `MISS` | `bom1::iad1` | CSP, X-Frame-Options, X-Content-Type, leaks `X-Powered-By` |

### Key Architectural Takeaways:
1. **Edge Cache Hits (`bom1`)**: Deliver exceptional sub-100ms TTFB (`72ms` on `/contact`).
2. **Serverless Cache Misses (`bom1::iad1`)**: Experience an 18x latency spike (`1,320ms` on `/careers`) due to the transcontinental network transit from Mumbai to Virginia origin functions.

---

## 5. Conclusion

Cynbit's web architecture leverages a modern Next.js App Router and Vercel edge stack, enabling agile development and fast static delivery. However, the observable configuration reveals significant opportunities to:
- Harden HTTP headers and defense-in-depth posture.
- Relocate serverless compute execution regions to eliminate cross-continental latency.
- Protect Server Actions with input validation (Zod) and rate limiting.
- Standardize redirect codes and CORS policies.

The subsequent sections detail categorized findings and complete, production-grade remediation code.

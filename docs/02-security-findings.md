# Security & Performance Findings

This document presents categorized findings derived from the passive backend inspection of `https://cynbit.in` and `https://www.cynbit.in`. Each issue includes an industry-standard severity rating, observable evidence, security/performance impact, and remediation overview.

---

## Table of Findings

| ID | Category | Severity | Title | Impact |
| :--- | :--- | :--- | :--- | :--- |
| **SEC-01** | Security | **Medium** | Missing Clickjacking Protection (`X-Frame-Options`) | UI Redressing / Frame injection |
| **SEC-02** | Security | **Medium** | Missing Content-Security-Policy (CSP) | XSS and unauthorized script execution |
| **SEC-03** | Security | **Low** | Missing `X-Content-Type-Options: nosniff` | MIME-type confusion / sniffing |
| **SEC-04** | Security | **Medium** | Overly Permissive Wildcard CORS on Document Requests | Uncontrolled origin data sharing |
| **SEC-05** | Security | **Low** | Framework & Infrastructure Fingerprint Disclosure | Reconnaissance facilitation for attackers |
| **SEC-06** | Security | **High** | Unprotected Server Actions & Lack of Edge Rate Limiting | Resource exhaustion / automated spam |
| **SEC-07** | Security | **Medium** | Sensitive Internal Route Disclosure via `robots.txt` (`/admin/`, `/portal/`) | Attack surface mapping & administrative targeting |
| **PERF-01** | Performance | **High** | Cross-Continental Edge-Origin Function Latency | High TTFB (~1,300ms) for Indian users |
| **PERF-02** | Performance | **Medium** | Apex Domain Employs HTTP 307 Temporary Redirect | Non-cached roundtrip latency on apex visits |
| **PERF-03** | Performance | **Low** | Suboptimal Client-Side Caching Headers | Unnecessary origin/CDN revalidation |
| **DATA-01** | Data Handling | **Low** | 200 OK Returned for Non-Existent Candidate Tokens | Soft 404, crawler pollution, enumeration |

---

## Detailed Security Findings

### SEC-01: Missing Clickjacking Protection (`X-Frame-Options` & CSP `frame-ancestors`)
- **Severity**: **Medium** (CVSS: 5.4)
- **Observable Evidence**:
  ```http
  GET /candidate/cmvxlxwlp000208l7tz276p4e HTTP/1.1
  Host: www.cynbit.in
  
  HTTP/1.1 200 OK
  # Neither X-Frame-Options nor frame-ancestors header is present
  ```
- **Impact**: Without frame restrictions, malicious sites can render Cynbit's portal inside an `<iframe>` and trick candidates into submitting unauthorized repositories or clicking hijacked interactive buttons (Clickjacking / UI Redressing).
- **Remediation**:
  Send `X-Frame-Options: DENY` (or `SAMEORIGIN`) and enforce `Content-Security-Policy: frame-ancestors 'none';`.

---

### SEC-02: Missing Content-Security-Policy (CSP)
- **Severity**: **Medium** (CVSS: 6.1)
- **Observable Evidence**:
  Across all checked endpoints (`/`, `/candidate/[token]`, `/careers`, `/contact`, `/bitelevate`), the `Content-Security-Policy` header is absent.
- **Impact**: A missing CSP increases vulnerability to Cross-Site Scripting (XSS), malicious script injections via third-party dependencies, and unauthorized data exfiltration.
- **Remediation**:
  Define a strict CSP with nonce-based script loading in Next.js middleware, allowing only trusted origins for Google Analytics, Cashfree SDKs, and Vercel analytics.

---

### SEC-03: Missing `X-Content-Type-Options: nosniff`
- **Severity**: **Low** (CVSS: 3.7)
- **Observable Evidence**:
  Header `X-Content-Type-Options` is completely absent from all HTTP responses.
- **Impact**: Older browsers and certain crawlers may inspect the byte stream and ignore declared MIME types, leading to drive-by script execution if user-supplied content or dynamic media is rendered.
- **Remediation**:
  Add `X-Content-Type-Options: nosniff` globally in `next.config.mjs` or edge middleware.

---

### SEC-04: Overly Permissive Wildcard CORS on Document Requests
- **Severity**: **Medium** (CVSS: 5.3)
- **Observable Evidence**:
  ```http
  GET https://www.cynbit.in/ HTTP/1.1
  
  HTTP/1.1 200 OK
  Access-Control-Allow-Origin: *
  ```
  Static and ISR pages (`/`, `/contact`, `/bitelevate`) return `Access-Control-Allow-Origin: *` on full HTML document responses.
- **Impact**: While standard for public API GET endpoints or open static assets (e.g. fonts), reflecting wildcard CORS on application HTML documents breaks least-privilege boundary models and permits external web applications to read rendered DOM trees cross-origin.
- **Remediation**:
  Restrict CORS headers strictly to dedicated public API routes and assets, while disallowing wildcard cross-origin access on application document routes.

---

### SEC-05: Framework & Infrastructure Fingerprint Disclosure
- **Severity**: **Low** (CVSS: 2.6)
- **Observable Evidence**:
  ```http
  GET https://www.cynbit.in/candidate/cmvxlxwlp000208l7tz276p4e HTTP/1.1
  
  HTTP/1.1 200 OK
  Server: Vercel
  X-Powered-By: Next.js
  X-Vercel-Id: bom1::iad1::2wfm9-1793627459118-6bfd4a808937
  ```
- **Impact**: Leaking the exact framework (`X-Powered-By: Next.js`) and internal hosting topology aids automated attackers in tailoring targeted exploits against known Next.js App Router vulnerabilities.
- **Remediation**:
  Disable the header via `poweredByHeader: false` in `next.config.mjs`.

---

### SEC-06: Unprotected Server Actions & Lack of Edge Rate Limiting
- **Severity**: **High** (CVSS: 7.5)
- **Observable Evidence**:
  Next.js Server Actions are exported with public reference hashes:
  - `78de5071582a09a9b67d2d42a8aeda17e31bc0d611` (`submitCandidateAssessment`)
  - `40fadee9d56006937ac69b7d95ab6ec4d321bc7b85` (`createCashfreeOrder`)
  - `submitCandidateSupportTicket`
- **Impact**: Any external client can script high-frequency POST requests to these Server Actions without going through the web UI. Without edge-level token-bucket rate limiting and cryptographically secure CSRF / origin validation, these actions are susceptible to:
  1. Flooding candidate records and triggering infinite database writes.
  2. Generating dangling order IDs on Cashfree.
  3. Denying service to legitimate applicants.
- **Remediation**:
  Implement a `safeAction` middleware pattern that enforces sliding-window IP/token rate limiting (e.g., Upstash / Redis), schema validation (Zod), and strict origin header verification.

---

### SEC-07: Sensitive Internal Route Disclosure via `robots.txt`
- **Severity**: **Medium** (CVSS: 5.3)
- **Observable Evidence**:
  ```http
  GET https://www.cynbit.in/robots.txt HTTP/1.1
  
  User-agent: *
  Allow: /
  Sitemap: https://cynbit.in/sitemap.xml
  Crawl-delay: 1
  Disallow: /api/
  Disallow: /admin/
  Disallow: /portal/
  ```
- **Impact**: Disallowing `/admin/` and `/portal/` in a public `robots.txt` explicitly informs automated crawlers, malicious reconnaissance engines, and threat actors that administrative and internal management endpoints exist at those paths. Search crawlers obey `robots.txt`, but adversaries deliberately target paths listed in `Disallow`.
- **Remediation**:
  Remove private/admin route listings from public `robots.txt`. Enforce Zero Trust authentication, IP allowlisting (Cloudflare Access / Vercel Edge Middleware), and multi-factor authentication (MFA) on `/admin/*` and `/portal/*` routes. Emit `X-Robots-Tag: noindex, nofollow` HTTP headers from the protected endpoints themselves.

---

## Detailed Performance & Reliability Findings

### PERF-01: Cross-Continental Edge-Origin Function Latency
- **Severity**: **High**
- **Observable Evidence**:
  - Edge Node: `bom1` (Mumbai, India)
  - Execution Node: `iad1` (North Virginia, USA)
  - Dynamic route `/careers`: **1,320ms TTFB**
  - Candidate portal `/candidate/...`: **278ms - 550ms TTFB**
  - Static cached route `/contact`: **72ms TTFB**
- **Impact**: Because Cynbit targets Indian talent, businesses, and engineering programs (Jaipur headquarters), having serverless functions default to Vercel's default region (`iad1`) adds **180ms - 220ms of pure speed-of-light network transit per database query or RPC action**.
- **Remediation**:
  Configure the function execution region to Mumbai (`bom1`) in `next.config.mjs` or `vercel.json`:
  ```json
  {
    "regions": ["bom1"]
  }
  ```

---

### PERF-02: Apex Domain Employs HTTP 307 Temporary Redirect
- **Severity**: **Medium**
- **Observable Evidence**:
  ```http
  GET https://cynbit.in HTTP/1.1
  
  HTTP/1.1 307 Temporary Redirect
  Location: https://www.cynbit.in/
  Cache-Control: public, max-age=0, must-revalidate
  ```
- **Impact**: HTTP 307 specifies that the redirect is temporary and method-preserving. Search crawlers and browsers will never cache this redirection permanently. Every user typing `cynbit.in` in their address bar must make an initial roundtrip to Vercel before initiating the real connection to `www.cynbit.in`.
- **Remediation**:
  Configure domain forwarding as **HTTP 308 Permanent Redirect** (or 301) with `Cache-Control: public, max-age=31536000, immutable`.

---

### PERF-03: Suboptimal Client-Side Caching Headers
- **Severity**: **Low**
- **Observable Evidence**:
  `Cache-Control: public, max-age=0, must-revalidate` is returned on static marketing pages (`/`, `/contact`, `/bitelevate`).
- **Impact**: Even though Vercel's edge cache retains the response (`X-Vercel-Cache: HIT`), user browsers are instructed to send an `If-None-Match` revalidation conditional request on every revisit.
- **Remediation**:
  Implement modern ISR caching directives:
  `Cache-Control: public, s-maxage=3600, stale-while-revalidate=86400`.

---

## Detailed Data Handling Findings

### DATA-01: Soft 404 / 200 OK Status on Non-Existent Candidate Tokens
- **Severity**: **Low**
- **Observable Evidence**:
  - `GET /candidate/cmvxlxwlp000208l7tz276p4e` $\rightarrow$ `HTTP 200 OK` (Valid CUID)
  - `GET /candidate/doesnotexist` $\rightarrow$ `HTTP 200 OK` (Invalid CUID)
  - `GET /candidate/cmv0000000000000000000000` $\rightarrow$ `HTTP 200 OK` (Synthetic CUID)
- **Impact**: Rendering the page shell with `200 OK` for invalid tokens is an anti-pattern. Search engines index empty/broken candidate pages, and API consumers cannot programmatically detect token invalidity through standard HTTP status semantics.
- **Remediation**:
  Perform server-side token validation in the Next.js `page.tsx` Server Component using `notFound()` from `next/navigation` to immediately emit an authentic `HTTP 404 Not Found` header.

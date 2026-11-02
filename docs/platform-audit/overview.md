# Whole-Platform Route Audit: Overview & Topology

This suite provides a route-by-route backend audit of Cynbit’s public digital platform (`https://www.cynbit.in`), evaluating routing strategies, caching behavior, serverless body constraints, and external integrations across every major platform vertical.

---

## Route Classification Matrix

| Route | Primary Responsibility | Rendering Mode | Observed TTFB | Cache Status | Identified Architectural Risk / Bottleneck |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`/`** | Landing Page & Hero Section | Static / ISR | 139ms | `HIT` (`bom1`) | Wildcard CORS on HTML document; missing CSP. |
| **`/services`** | Service Catalog & Capabilities | Static / ISR | 146ms | `HIT` (`bom1`) | Static asset revalidation; unoptimized remote SVG/images. |
| **`/careers`** | Job Listings & Application Funnel | Dynamic SSR | **1,103ms** | `MISS` (`bom1::iad1`) | Serverless 4.5MB upload limit on resume ingestion; transatlantic latency. |
| **`/contact`** | Client Inquiries & Lead Capture | Static / ISR Form | 122ms | `HIT` (`bom1`) | Synchronous email/CRM submission bottlenecks; lack of honeypot bot defense. |
| **`/bitelevate`** | Engineering Cohort Training Program | Static / ISR Funnel | 138ms | `HIT` (`bom1`) | Cashfree checkout integration, high-concurrency database connection pooling. |
| **`/candidate/[token]`**| Candidate Technical Assessment | Dynamic SSR | 361ms | `MISS` (`bom1::iad1`) | Exposed Server Actions; missing rate limiters; capability token lifetime. |
| **`/admin/` & `/portal/`**| Internal Enterprise Portals | Restricted / Auth | Disallowed | N/A | **Route disclosure in `/robots.txt`** exposing administrative routes to attackers. |

---

## Key Backend Observations Across Routes

1. **Edge Caching Segregation**: Marketing routes (`/services`, `/contact`, `/bitelevate`) successfully hit Vercel's edge cache in Mumbai (`bom1`) with response times of 110ms–150ms.
2. **Serverless Execution Regional Disconnect**: Any dynamic execution (`/careers`, `/candidate/[token]`) falls back to `iad1` (Virginia), resulting in an 8x–10x latency degradation.
3. **Information Leaks in `robots.txt`**: Cynbit's `robots.txt` explicitly discloses sensitive internal path names:
   ```text
   Disallow: /api/
   Disallow: /admin/
   Disallow: /portal/
   ```
   *Recommendation*: Disclosing `/admin/` and `/portal/` tells automated reconnaissance scanners exactly where administrative portals exist. These should be protected by Zero Trust / IP allowlisting (Cloudflare Access / Vercel Edge Middleware) rather than advertised in public robots files.

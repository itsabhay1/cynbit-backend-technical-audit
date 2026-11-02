# Platform Audit: `/services` — Caching, ISR & Edge Asset Delivery

## Route Context
- **Target Route**: `https://www.cynbit.in/services`
- **Observed Headers**:
  ```http
  HTTP/1.1 200 OK
  Server: Vercel
  Cache-Control: public, max-age=0, must-revalidate
  X-Vercel-Cache: HIT
  X-Vercel-Id: bom1::qsz74-1793628991854-9f084e9c577a
  Access-Control-Allow-Origin: *
  ```
- **Observed TTFB**: ~118ms – 146ms

---

## Technical Observations

### 1. Static Edge Delivery (ISR)
The `/services` route is pre-rendered at build time and cached across Vercel’s global Edge network (`bom1` edge node in Mumbai). This results in snappy initial rendering.

### 2. Client-Side Revalidation Bottleneck
The header `Cache-Control: public, max-age=0, must-revalidate` forces client browsers to send conditional `If-None-Match` requests on subsequent visits instead of utilizing browser disk cache.

### 3. Image & Asset Optimization Risks
- Marketing assets on `/services` use Next.js `<Image />` optimization.
- **Risk**: Without restrictive `remotePatterns` in `next.config.mjs`, attackers can trigger server-side Denial-of-Service by requesting arbitrary image transformations through `/_next/image?url=...&w=...&q=...`.

---

## Architectural Recommendations

1. **Implement Modern Cache Control**:
   Configure ISR with `stale-while-revalidate` to allow browsers to cache pages locally while refreshing asynchronously:
   ```text
   Cache-Control: public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800
   ```
2. **Restrict Remote Patterns**:
   Lock `images.remotePatterns` to trusted CDNs only (e.g. `cdn.cynbit.in` and `www.cynbit.in`).
3. **Remove Wildcard CORS**: Strip `Access-Control-Allow-Origin: *` from the static document response.

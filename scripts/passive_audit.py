#!/usr/bin/env python3
"""
Cynbit Passive Backend Technical Audit & Telemetry Collector (Python)

Conducts strictly passive, non-intrusive HTTP inspections against public endpoints.
Complies with assessment guidelines:
"Only passive and authorized testing is permitted. Do not attempt to exploit, disrupt, overload, or gain unauthorized access."
"""

import sys
import time
import socket
import urllib.request
import urllib.error
import ssl

TARGETS = [
    {"label": "Apex Domain (Redirect Check)", "url": "https://cynbit.in"},
    {"label": "Canonical Web Domain (Landing Page)", "url": "https://www.cynbit.in/"},
    {"label": "Dynamic SSR Candidate Assessment Portal", "url": "https://www.cynbit.in/candidate/cmvxlxwlp000208l7tz276p4e"},
    {"label": "Careers (Dynamic SSR Page)", "url": "https://www.cynbit.in/careers"},
    {"label": "Services (Marketing Page)", "url": "https://www.cynbit.in/services"},
    {"label": "Contact Page (Lead Capture)", "url": "https://www.cynbit.in/contact"},
    {"label": "BitElevate Educational Funnel", "url": "https://www.cynbit.in/bitelevate"},
]

def check_dns(domain):
    print(f"\n[1] DNS RESOLUTION FOR {domain}:")
    try:
        ips = socket.gethostbyname_ex(domain)
        print(f"  Canonical Hostname: {ips[0]}")
        print(f"  Aliases: {ips[1]}")
        print(f"  IP Addresses: {', '.join(ips[2])}")
    except Exception as e:
        print(f"  DNS Lookup Failed: {e}")

class NoRedirectHandler(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None

def probe_url(target):
    url = target["url"]
    label = target["label"]
    print(f"--- [Target: {label}] ---")
    print(f"URL: {url}")

    req = urllib.request.Request(
        url,
        headers={"User-Agent": "Cynbit-Backend-Audit-Probe/1.0 (Passive Assessment)"}
    )

    # Use handler that does not follow redirects automatically so we can measure apex redirect
    opener = urllib.request.build_opener(NoRedirectHandler)
    start_time = time.time()

    try:
        resp = opener.open(req, timeout=10)
        latency_ms = int((time.time() - start_time) * 1000)
        status = resp.status
        headers = {k.lower(): v for k, v in resp.headers.items()}
    except urllib.error.HTTPError as e:
        latency_ms = int((time.time() - start_time) * 1000)
        status = e.code
        headers = {k.lower(): v for k, v in e.headers.items()}
    except Exception as e:
        print(f"  Connection Error: {e}\n")
        return

    print(f"  Status Code:       {status}")
    print(f"  Roundtrip TTFB:    {latency_ms}ms")
    print(f"  Server:            {headers.get('server', 'N/A')}")
    print(f"  Framework Leaked:  {headers.get('x-powered-by', 'None / Hidden')}")
    print(f"  Cache-Control:     {headers.get('cache-control', 'None')}")
    print(f"  Vercel Edge Node:  {headers.get('x-vercel-id', 'None')}")
    print(f"  Vercel Cache:      {headers.get('x-vercel-cache', 'None')}")
    print(f"  HSTS:              {headers.get('strict-transport-security', 'MISSING')}")
    print(f"  CSP:               {'Configured' if 'content-security-policy' in headers else 'MISSING (Security Risk)'}")
    print(f"  X-Frame-Options:   {headers.get('x-frame-options', 'MISSING (Clickjacking Risk)')}")
    print(f"  X-Content-Type:    {headers.get('x-content-type-options', 'MISSING (MIME Sniffing Risk)')}")
    print(f"  CORS Origin:       {headers.get('access-control-allow-origin', 'None')}")
    if 'location' in headers:
        print(f"  Redirect Location: {headers.get('location')}")
    print()

def inspect_robots_txt():
    print("[3] ROBOTS.TXT ROUTE DISCLOSURE AUDIT:")
    try:
        req = urllib.request.Request("https://www.cynbit.in/robots.txt", headers={"User-Agent": "Cynbit-Audit/1.0"})
        with urllib.request.urlopen(req, timeout=5) as resp:
            content = resp.read().decode('utf-8')
            for line in content.splitlines():
                if line.startswith('Disallow:') or line.startswith('Sitemap:'):
                    print(f"  {line}")
    except Exception as e:
        print(f"  Failed to fetch robots.txt: {e}")
    print()

def main():
    print("=" * 80)
    print("CYNBIT TECHNOLOGIES - PYTHON PASSIVE BACKEND OBSERVATION AUDIT")
    print(f"Timestamp: {time.strftime('%Y-%m-%d %H:%M:%S UTC', time.gmtime())}")
    print("=" * 80)

    check_dns("cynbit.in")
    check_dns("www.cynbit.in")

    print("\n[2] ENDPOINT AUDIT & OBSERVABLE SIGNALS:\n")
    for target in TARGETS:
        probe_url(target)

    inspect_robots_txt()
    print("Audit collector completed successfully.")

if __name__ == "__main__":
    main()

#!/usr/bin/env node

/**
 * Cynbit Passive Backend Technical Audit Collector
 * 
 * Conducts strictly passive, read-only HTTP inspections against public endpoints.
 * Complies with the assessment instruction:
 * "Only passive and authorized testing is permitted. Do not attempt to exploit, disrupt, overload, or gain unauthorized access."
 */

import https from 'node:https';
import dns from 'node:dns/promises';

const TARGETS = [
  { label: 'Apex Domain (Redirect Check)', url: 'https://cynbit.in' },
  { label: 'Canonical Web Domain (Landing Page)', url: 'https://www.cynbit.in/' },
  { label: 'Dynamic SSR Candidate Assessment Portal', url: 'https://www.cynbit.in/candidate/cmvxlxwlp000208l7tz276p4e' },
  { label: 'Careers (Dynamic SSR Page)', url: 'https://www.cynbit.in/careers' },
  { label: 'Contact Page (Static/ISR Page)', url: 'https://www.cynbit.in/contact' },
  { label: 'BitElevate Educational Page', url: 'https://www.cynbit.in/bitelevate' },
];

function fetchMetadata(url) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const req = https.get(url, { headers: { 'User-Agent': 'Cynbit-Backend-Audit-Probe/1.0' } }, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        const latency = Date.now() - startTime;
        resolve({
          url,
          status: res.statusCode,
          headers: res.headers,
          latencyMs: latency,
          bodyLength: Buffer.byteLength(body, 'utf8'),
          bodySnippet: body.slice(0, 1000)
        });
      });
    });

    req.on('error', (err) => {
      resolve({ url, error: err.message, latencyMs: Date.now() - startTime });
    });
  });
}

async function runAudit() {
  console.log('='.repeat(80));
  console.log('CYNBIT TECHNOLOGIES - PASSIVE BACKEND OBSERVATION AUDIT');
  console.log('Generated at: ' + new Date().toISOString());
  console.log('='.repeat(80));

  console.log('\n[1] DNS RESOLUTION & ANYCAST TOPOGRAPHY:');
  try {
    const aRecords = await dns.resolve4('cynbit.in');
    console.log('  cynbit.in A Records:', aRecords.join(', '));
  } catch (e) {
    console.log('  cynbit.in A record lookup failed:', e.message);
  }

  try {
    const cnameRecords = await dns.resolveCname('www.cynbit.in');
    console.log('  www.cynbit.in CNAME Records:', cnameRecords.join(', '));
  } catch {
    console.log('  www.cynbit.in: Direct A/Alias resolution');
  }

  console.log('\n[2] ENDPOINT AUDIT & OBSERVABLE SIGNALS:\n');

  for (const target of TARGETS) {
    console.log(`--- [Target: ${target.label}] ---`);
    console.log(`URL: ${target.url}`);
    const data = await fetchMetadata(target.url);

    if (data.error) {
      console.log(`  ERROR: ${data.error}`);
      continue;
    }

    console.log(`  Status Code:       ${data.status}`);
    console.log(`  Roundtrip TTFB:    ${data.latencyMs}ms`);
    console.log(`  Server:            ${data.headers['server'] || 'N/A'}`);
    console.log(`  Framework (Leaked):${data.headers['x-powered-by'] || 'Hidden / None'}`);
    console.log(`  Cache-Control:     ${data.headers['cache-control'] || 'None'}`);
    console.log(`  Vercel Edge Node:  ${data.headers['x-vercel-id'] || 'None'}`);
    console.log(`  Vercel Cache:      ${data.headers['x-vercel-cache'] || 'None'}`);
    console.log(`  HSTS:              ${data.headers['strict-transport-security'] || 'MISSING'}`);
    console.log(`  CSP:               ${data.headers['content-security-policy'] ? 'Configured' : 'MISSING (Security Risk)'}`);
    console.log(`  X-Frame-Options:   ${data.headers['x-frame-options'] || 'MISSING (Clickjacking Risk)'}`);
    console.log(`  X-Content-Type:    ${data.headers['x-content-type-options'] || 'MISSING (MIME Sniffing Risk)'}`);
    console.log(`  CORS Allow-Origin: ${data.headers['access-control-allow-origin'] || 'None'}`);
    if (data.headers['location']) {
      console.log(`  Redirect Location: ${data.headers['location']}`);
    }
    console.log('');
  }

  console.log('Audit collector completed successfully.');
}

runAudit();

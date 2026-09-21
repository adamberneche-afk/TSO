'use strict';
// Regression tests for tools/header-drift/check.js — no real network and no
// real render.yaml; fetchImpl and the YAML text are both injected, the same
// convention tests/db-health.test.js and tests/deploy-drift.test.js use.
//
// Two cases carry most of the weight:
//   - the cron block's `headers:` (key/value) must never be mistaken for a
//     static site's response headers (path/name/value). Both shapes are
//     present in the real render.yaml, so a parser that keys on position
//     rather than shape would silently check the wrong thing.
//   - a file that yields NO declarations must FAIL. A checker that quietly
//     verifies nothing and reports success is the exact failure mode this
//     repo keeps getting bitten by.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  parseDeclaredHeaders,
  normalizeHeaderValue,
  headerMatches,
  resolveConcretePath,
  checkService,
  summarize,
  report,
  originFor,
} = require('../tools/header-drift/check.js');

// Shaped like the real render.yaml, cron trap included.
const YAML = `services:
  - type: web
    name: tais-registry
    runtime: node
    envVars:
      - key: NODE_ENV
        value: production

  - type: web
    name: tais-frontend
    runtime: static
    routes:
      - type: rewrite
        source: /*
        destination: /index.html
    headers:
      - path: /assets/*
        name: Cache-Control
        value: public, max-age=31536000, immutable
      - path: /index.html
        name: Cache-Control
        value: no-cache

cron:
  - name: memory-reports
    headers:
      - key: Authorization
        value: "Bearer {{ .Envs.CRON_SECRET }}"

databases:
  - name: tais-rag
`;

// ---------------------------------------------------------------------------
// parseDeclaredHeaders
// ---------------------------------------------------------------------------

test('parseDeclaredHeaders: extracts a static site\'s response headers', () => {
  const parsed = parseDeclaredHeaders(YAML);
  assert.deepEqual(parsed['tais-frontend'], [
    { path: '/assets/*', name: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
    { path: '/index.html', name: 'Cache-Control', value: 'no-cache' },
  ]);
});

// THE parser trap, and it is present in the real file.
test('parseDeclaredHeaders: the cron job\'s request headers are NOT collected', () => {
  const parsed = parseDeclaredHeaders(YAML);
  const all = Object.values(parsed).flat();
  assert.ok(!all.some((h) => h.name === 'Authorization'), 'cron Authorization header must not be treated as a response header');
  assert.ok(!Object.prototype.hasOwnProperty.call(parsed, 'memory-reports'));
});

test('parseDeclaredHeaders: a service with no headers block contributes nothing', () => {
  const parsed = parseDeclaredHeaders(YAML);
  assert.ok(!Object.prototype.hasOwnProperty.call(parsed, 'tais-registry'));
});

test('parseDeclaredHeaders: quoted values are unquoted', () => {
  const parsed = parseDeclaredHeaders(`services:
  - type: web
    name: s
    headers:
      - path: "/x"
        name: 'X-Thing'
        value: "a, b"
`);
  assert.deepEqual(parsed.s, [{ path: '/x', name: 'X-Thing', value: 'a, b' }]);
});

test('parseDeclaredHeaders: an incomplete entry is dropped rather than half-used', () => {
  const parsed = parseDeclaredHeaders(`services:
  - type: web
    name: s
    headers:
      - path: /x
        name: X-Thing
`);
  assert.equal(parsed.s, undefined);
});

test('parseDeclaredHeaders: comments and blank lines do not confuse it', () => {
  const parsed = parseDeclaredHeaders(`services:
  - type: web
    name: s

    # a comment about headers
    headers:
      # why this rule exists
      - path: /x
        name: X-Thing
        value: v
`);
  assert.deepEqual(parsed.s, [{ path: '/x', name: 'X-Thing', value: 'v' }]);
});

test('parseDeclaredHeaders: a file with no services yields nothing', () => {
  assert.deepEqual(parseDeclaredHeaders('version: "1"\n'), {});
});

// ---------------------------------------------------------------------------
// normalizeHeaderValue / headerMatches
// ---------------------------------------------------------------------------

test('headerMatches: directive order and spacing do not matter', () => {
  // A CDN may reorder or respace directives without changing meaning, and a
  // check that fails on that is a check that gets muted.
  assert.equal(headerMatches('public, max-age=31536000, immutable', 'immutable,public,  max-age=31536000'), true);
});

test('headerMatches: case does not matter', () => {
  assert.equal(headerMatches('no-cache', 'No-Cache'), true);
});

test('headerMatches: a genuinely different value does not match', () => {
  assert.equal(headerMatches('no-cache', 'max-age=3600'), false);
});

test('headerMatches: a missing directive is caught, not rounded off', () => {
  assert.equal(headerMatches('public, max-age=31536000, immutable', 'public, max-age=31536000'), false);
});

test('headerMatches: a null actual never matches', () => {
  assert.equal(headerMatches('no-cache', null), false);
});

test('normalizeHeaderValue: null stays null', () => {
  assert.equal(normalizeHeaderValue(null), null);
});

// ---------------------------------------------------------------------------
// resolveConcretePath
// ---------------------------------------------------------------------------

test('resolveConcretePath: a concrete path passes straight through', () => {
  assert.deepEqual(resolveConcretePath('/index.html', ''), { path: '/index.html' });
});

test('resolveConcretePath: a wildcard resolves to a REAL asset from the live index.html', () => {
  // Inventing a filename would prove nothing: the SPA rewrite would serve
  // index.html for a non-existent path and the comparison would silently be
  // measuring the wrong resource.
  const html = '<script type="module" src="/assets/index-a1b2c3d4.js"></script>';
  assert.deepEqual(resolveConcretePath('/assets/*', html), { path: '/assets/index-a1b2c3d4.js' });
});

test('resolveConcretePath: no matching asset is a reported problem, not a silent pass', () => {
  const resolved = resolveConcretePath('/assets/*', '<html><body>nothing here</body></html>');
  assert.equal(resolved.path, null);
  assert.ok(resolved.problem.includes('cannot be verified'));
});

// ---------------------------------------------------------------------------
// checkService
// ---------------------------------------------------------------------------

function res({ status = 200, headers = {}, text = '' } = {}) {
  return {
    status,
    ok: status >= 200 && status < 300,
    headers: { get: (n) => (n.toLowerCase() in lower(headers) ? lower(headers)[n.toLowerCase()] : null) },
    text: async () => text,
  };
}
function lower(h) {
  return Object.fromEntries(Object.entries(h).map(([k, v]) => [k.toLowerCase(), v]));
}

const DECL_INDEX = [{ path: '/index.html', name: 'Cache-Control', value: 'no-cache' }];

test('checkService: a matching header is ok', async () => {
  const fetchImpl = async () => res({ headers: { 'Cache-Control': 'no-cache' } });
  const [r] = await checkService('s', DECL_INDEX, 'https://x.test', { fetchImpl });
  assert.equal(r.status, 'ok');
});

test('checkService: an absent header is reported as missing, with what was expected', async () => {
  const fetchImpl = async () => res({ headers: {} });
  const [r] = await checkService('s', DECL_INDEX, 'https://x.test', { fetchImpl });
  assert.equal(r.status, 'missing');
  assert.ok(r.detail.includes('no Cache-Control header at all'));
  assert.ok(r.detail.includes('no-cache'));
});

test('checkService: a different value is a mismatch naming both sides', async () => {
  const fetchImpl = async () => res({ headers: { 'Cache-Control': 'max-age=3600' } });
  const [r] = await checkService('s', DECL_INDEX, 'https://x.test', { fetchImpl });
  assert.equal(r.status, 'mismatch');
  assert.equal(r.actual, 'max-age=3600');
  assert.equal(r.expected, 'no-cache');
});

test('checkService: a network failure is unreachable, distinct from a header problem', async () => {
  const fetchImpl = async () => { throw new Error('ENOTFOUND'); };
  const [r] = await checkService('s', DECL_INDEX, 'https://x.test', { fetchImpl });
  assert.equal(r.status, 'unreachable');
  assert.ok(r.detail.includes('ENOTFOUND'));
});

test('checkService: a non-2xx is unreachable rather than a silent pass', async () => {
  const fetchImpl = async () => res({ status: 500 });
  const [r] = await checkService('s', DECL_INDEX, 'https://x.test', { fetchImpl });
  assert.equal(r.status, 'unreachable');
});

test('checkService: a wildcard rule fetches index.html and then the real asset', async () => {
  const seen = [];
  const fetchImpl = async (url) => {
    seen.push(url);
    if (url.endsWith('/index.html')) {
      return res({ text: '<script src="/assets/app-deadbeef.js"></script>', headers: { 'Cache-Control': 'no-cache' } });
    }
    return res({ headers: { 'Cache-Control': 'public, max-age=31536000, immutable' } });
  };
  const decls = [{ path: '/assets/*', name: 'Cache-Control', value: 'public, max-age=31536000, immutable' }];
  const [r] = await checkService('s', decls, 'https://x.test', { fetchImpl });
  assert.equal(r.status, 'ok');
  assert.ok(seen.includes('https://x.test/assets/app-deadbeef.js'), 'must request the real asset');
});

// ---------------------------------------------------------------------------
// summarize — the anti-vacuous-pass rule
// ---------------------------------------------------------------------------

test('summarize: ZERO declarations is a FAILURE, never a pass', () => {
  // The most important test in this file. If render.yaml loses its headers,
  // or this tool stops being able to parse them, the check must go red --
  // not quietly verify nothing forever and report success.
  const summary = summarize([], { declaredCount: 0 });
  assert.equal(summary.healthy, false);
  assert.equal(summary.findings[0].status, 'no-declarations');
  assert.ok(summary.findings[0].detail.includes('vacuous'));
});

test('summarize: all-ok results are healthy', () => {
  const summary = summarize([{ status: 'ok', detail: 'fine' }], { declaredCount: 1 });
  assert.equal(summary.healthy, true);
  assert.equal(summary.findings.length, 0);
});

test('summarize: every non-ok result becomes a finding', () => {
  const summary = summarize(
    [{ status: 'ok', detail: 'fine' }, { status: 'missing', detail: 'a' }, { status: 'mismatch', detail: 'b' }],
    { declaredCount: 3 }
  );
  assert.equal(summary.healthy, false);
  assert.equal(summary.findings.length, 2);
});

test('report: a failure says render.yaml is not synced, so nobody re-learns it the hard way', () => {
  const summary = summarize([{ status: 'missing', detail: 'a', service: 's', declaredPath: '/x', header: 'H' }], { declaredCount: 1 });
  const text = report(summary);
  assert.ok(text.includes('NOT synced'));
  assert.ok(text.includes('Settings -> Headers'));
});

// ---------------------------------------------------------------------------
// originFor — reuses deploy-drift's service registry rather than a second copy
// ---------------------------------------------------------------------------

test('originFor: derives an origin from deploy-drift\'s known services', () => {
  assert.equal(originFor('tais-frontend'), 'https://tais-frontend.onrender.com');
});

test('originFor: an unknown service has no origin', () => {
  assert.equal(originFor('not-a-service'), null);
});

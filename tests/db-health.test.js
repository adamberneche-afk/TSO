'use strict';
// Regression tests for tools/db-health/check.js — no real network and no
// real clock; fetchImpl and `now` are both injectable, same convention
// tests/deploy-drift.test.js and tests/watchdog.test.js already use.
//
// The cases that matter most here are the ones that encode the real
// 2026-03/2026-09 outage: a 503 from /health meaning "service up, database
// down", and the expired-vs-stale-record correlation.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  probeConnectivity,
  probeSchema,
  evaluateExpiry,
  summarize,
  buildIssueBody,
  publishStatus,
  runProbes,
} = require('../tools/db-health/check.js');

const PROBE = { label: 'Database connectivity', url: 'https://example.test/health' };
const SCHEMA_PROBE = { label: 'Schema queryable', url: 'https://example.test/api/v1/skills?limit=1' };

function fakeResponse({ status = 200, body = {}, jsonThrows = false } = {}) {
  return {
    status,
    ok: status >= 200 && status < 300,
    json: async () => {
      if (jsonThrows) throw new Error('Unexpected token < in JSON');
      return body;
    },
  };
}

// ---------------------------------------------------------------------------
// probeConnectivity
// ---------------------------------------------------------------------------

test('probeConnectivity: healthy when /health reports services.database connected', async () => {
  const fetchImpl = async () => fakeResponse({ body: { status: 'healthy', services: { database: 'connected' } } });
  const result = await probeConnectivity(PROBE, fetchImpl);
  assert.equal(result.status, 'ok');
});

test('probeConnectivity: a 503 is reported as database-down, not as an unreachable service', async () => {
  // This is the exact response the live service returned for ~6 months.
  const fetchImpl = async () => fakeResponse({ status: 503, body: { status: 'unhealthy', error: 'Database connection failed' } });
  const result = await probeConnectivity(PROBE, fetchImpl);
  assert.equal(result.status, 'database-down');
  assert.ok(result.detail.includes('503'));
});

test('probeConnectivity: a 503 WITHOUT the app JSON body is a cold start, not a database outage', async () => {
  // Render answers its own HTML holding page while a free-plan instance
  // wakes. Reporting that as an outage would false-alarm most of the day.
  const fetchImpl = async () => fakeResponse({ status: 503, jsonThrows: true });
  const result = await probeConnectivity(PROBE, fetchImpl);
  assert.equal(result.status, 'service-waking');
});

test('probeConnectivity: a 502 is treated as a cold start too', async () => {
  const fetchImpl = async () => fakeResponse({ status: 502, jsonThrows: true });
  const result = await probeConnectivity(PROBE, fetchImpl);
  assert.equal(result.status, 'service-waking');
});

test('probeConnectivity: a network failure is service-unreachable, distinct from database-down', async () => {
  const fetchImpl = async () => { throw new Error('ENOTFOUND'); };
  const result = await probeConnectivity(PROBE, fetchImpl);
  assert.equal(result.status, 'service-unreachable');
  assert.ok(result.detail.includes('ENOTFOUND'));
});

test('probeConnectivity: 200 that does not report a connected database is not treated as healthy', async () => {
  const fetchImpl = async () => fakeResponse({ body: { status: 'healthy', services: { database: 'degraded' } } });
  const result = await probeConnectivity(PROBE, fetchImpl);
  assert.equal(result.status, 'unexpected-response');
  assert.ok(result.detail.includes('degraded'));
});

test('probeConnectivity: unparseable JSON is a finding rather than a crash', async () => {
  const fetchImpl = async () => fakeResponse({ jsonThrows: true });
  const result = await probeConnectivity(PROBE, fetchImpl);
  assert.equal(result.status, 'unexpected-response');
});

test('probeConnectivity: an unexpected non-2xx is reported with its status', async () => {
  const fetchImpl = async () => fakeResponse({ status: 404 });
  const result = await probeConnectivity(PROBE, fetchImpl);
  assert.equal(result.status, 'unexpected-response');
  assert.ok(result.detail.includes('404'));
});

// ---------------------------------------------------------------------------
// probeSchema
// ---------------------------------------------------------------------------

test('probeSchema: a real query result passes', async () => {
  const fetchImpl = async () => fakeResponse({ body: { skills: [{ id: 1 }], total: 3, page: 1, limit: 1 } });
  const result = await probeSchema(SCHEMA_PROBE, fetchImpl);
  assert.equal(result.status, 'ok');
});

test('probeSchema: an EMPTY registry still passes -- the check proves the query ran, not that rows exist', async () => {
  // Guards against the tempting-but-wrong `total > 0` assertion, which
  // would fail the moment the registry is legitimately emptied.
  const fetchImpl = async () => fakeResponse({ body: { skills: [], total: 0, page: 1, limit: 1 } });
  const result = await probeSchema(SCHEMA_PROBE, fetchImpl);
  assert.equal(result.status, 'ok');
});

test('probeSchema: a 500 is query-failed -- what an un-migrated database looks like', async () => {
  const fetchImpl = async () => fakeResponse({ status: 500 });
  const result = await probeSchema(SCHEMA_PROBE, fetchImpl);
  assert.equal(result.status, 'query-failed');
});

test('probeSchema: a 200 without a numeric total is unexpected-shape', async () => {
  const fetchImpl = async () => fakeResponse({ body: { skills: [] } });
  const result = await probeSchema(SCHEMA_PROBE, fetchImpl);
  assert.equal(result.status, 'unexpected-shape');
});

test('probeSchema: a network failure is service-unreachable', async () => {
  const fetchImpl = async () => { throw new Error('ECONNRESET'); };
  const result = await probeSchema(SCHEMA_PROBE, fetchImpl);
  assert.equal(result.status, 'service-unreachable');
});

test('probeSchema: a 503 is a cold start, not a failed query', async () => {
  const fetchImpl = async () => fakeResponse({ status: 503, jsonThrows: true });
  const result = await probeSchema(SCHEMA_PROBE, fetchImpl);
  assert.equal(result.status, 'service-waking');
});

// ---------------------------------------------------------------------------
// runProbes — cold-start retry
// ---------------------------------------------------------------------------

// Per-URL stub: the two probes hit different endpoints, so keying on the
// URL keeps each one's sequence independent instead of having them share a
// single call counter.
function perUrlStub(sequences) {
  const counts = {};
  return async (url) => {
    const key = url.includes('/health') ? 'health' : 'skills';
    counts[key] = (counts[key] || 0) + 1;
    const seq = sequences[key];
    const entry = seq[Math.min(counts[key] - 1, seq.length - 1)];
    return entry();
  };
}

test('runProbes: a cold start that recovers on retry reports healthy, not a false alarm', async () => {
  const fetchImpl = perUrlStub({
    // First request wakes the sleeping instance; the retry gets a real answer.
    health: [
      () => fakeResponse({ status: 503, jsonThrows: true }),
      () => fakeResponse({ body: { services: { database: 'connected' } } }),
    ],
    skills: [() => fakeResponse({ body: { skills: [], total: 0 } })],
  });
  let slept = 0;
  const results = await runProbes({ fetchImpl, sleepFn: async (ms) => { slept += ms; }, waitMs: 1000 });
  assert.deepEqual(results.map((r) => r.status), ['ok', 'ok']);
  assert.ok(slept > 0, 'should have waited before retrying');
});

test('runProbes: a persistent failure survives the retry and is still reported', async () => {
  const fetchImpl = async () => fakeResponse({ status: 503, jsonThrows: true });
  const results = await runProbes({ fetchImpl, sleepFn: async () => {}, waitMs: 1 });
  assert.equal(results[0].status, 'service-waking');
  assert.ok(results[0].detail.includes('still failing'));
});

test('runProbes: a real database-down answer is NOT retried away', async () => {
  // The app's own unhealthy JSON is a definitive answer -- retrying it
  // would only delay the alarm.
  let healthCalls = 0;
  const fetchImpl = async (url) => {
    if (url.includes('/health')) {
      healthCalls += 1;
      return fakeResponse({ status: 503, body: { status: 'unhealthy', error: 'Database connection failed' } });
    }
    return fakeResponse({ body: { skills: [], total: 0 } });
  };
  const results = await runProbes({ fetchImpl, sleepFn: async () => {}, waitMs: 1 });
  assert.equal(results[0].status, 'database-down');
  assert.equal(healthCalls, 1, 'a definitive answer is not retried');
});

// ---------------------------------------------------------------------------
// evaluateExpiry
// ---------------------------------------------------------------------------

const NOW = new Date('2026-10-01T00:00:00Z');

test('evaluateExpiry: comfortably in the future is ok', () => {
  const result = evaluateExpiry('tais-rag', { expiresAt: '2026-10-20T00:00:00Z', warnWithinDays: 10 }, NOW);
  assert.equal(result.status, 'ok');
  assert.equal(result.daysRemaining, 19);
});

test('evaluateExpiry: inside the warning window is expiring-soon', () => {
  const result = evaluateExpiry('tais-rag', { expiresAt: '2026-10-08T00:00:00Z', warnWithinDays: 10 }, NOW);
  assert.equal(result.status, 'expiring-soon');
  assert.equal(result.daysRemaining, 7);
});

test('evaluateExpiry: a passed date is expired, with how long ago', () => {
  const result = evaluateExpiry('tais-rag', { expiresAt: '2026-09-28T00:00:00Z', warnWithinDays: 10 }, NOW);
  assert.equal(result.status, 'expired');
  assert.ok(result.detail.includes('3 day(s) ago'));
});

test('evaluateExpiry: a missing expiresAt is unknown, not silently ok', () => {
  const result = evaluateExpiry('tais-rag', { warnWithinDays: 10 }, NOW);
  assert.equal(result.status, 'unknown');
});

test('evaluateExpiry: an unparseable expiresAt is unknown rather than NaN days', () => {
  const result = evaluateExpiry('tais-rag', { expiresAt: 'whenever', warnWithinDays: 10 }, NOW);
  assert.equal(result.status, 'unknown');
  assert.equal(result.daysRemaining, null);
});

// ---------------------------------------------------------------------------
// summarize — the correlation logic
// ---------------------------------------------------------------------------

const OK_PROBES = [
  { name: 'connectivity', status: 'ok', detail: 'fine' },
  { name: 'schema', status: 'ok', detail: 'fine' },
];

test('summarize: everything passing is healthy with no findings', () => {
  const summary = summarize(OK_PROBES, [{ dbName: 'tais-rag', status: 'ok', detail: 'expires in 19 day(s)' }]);
  assert.equal(summary.healthy, true);
  assert.equal(summary.findings.length, 0);
});

test('summarize: expired AND probes failing blames the expiry as the likely cause', () => {
  const probes = [
    { name: 'connectivity', status: 'database-down', detail: '503' },
    { name: 'schema', status: 'query-failed', detail: '500' },
  ];
  const summary = summarize(probes, [{ dbName: 'tais-rag', status: 'expired', detail: 'passed 3 day(s) ago' }]);
  assert.equal(summary.healthy, false);
  const expiryFinding = summary.findings.find((f) => f.kind === 'expiry');
  assert.equal(expiryFinding.status, 'expired-and-failing');
  assert.ok(expiryFinding.detail.includes('most likely cause'));
});

test('summarize: expired BUT probes healthy blames the record, not the database', () => {
  // The self-correcting case: a stale expiresAt makes every warning this
  // tool prints worthless, so it has to be reported against probes.js.
  const summary = summarize(OK_PROBES, [{ dbName: 'tais-rag', status: 'expired', detail: 'passed 3 day(s) ago' }]);
  assert.equal(summary.healthy, false);
  const finding = summary.findings.find((f) => f.kind === 'expiry');
  assert.equal(finding.status, 'stale-record');
  assert.ok(finding.detail.includes('probes.js'));
});

test('summarize: expiring-soon is a finding on its own, with healthy probes', () => {
  const summary = summarize(OK_PROBES, [{ dbName: 'tais-rag', status: 'expiring-soon', detail: 'expires in 7 day(s)' }]);
  assert.equal(summary.healthy, false);
  assert.equal(summary.findings[0].status, 'expiring-soon');
});

test('summarize: an unknown expiry is surfaced rather than passed over', () => {
  const summary = summarize(OK_PROBES, [{ dbName: 'tais-rag', status: 'unknown', detail: 'no expiresAt recorded' }]);
  assert.equal(summary.healthy, false);
  assert.equal(summary.findings[0].status, 'unknown');
});

test('summarize: every failing probe becomes its own finding', () => {
  const probes = [
    { name: 'connectivity', status: 'database-down', detail: '503' },
    { name: 'schema', status: 'query-failed', detail: '500' },
  ];
  const summary = summarize(probes, [{ dbName: 'tais-rag', status: 'ok', detail: 'fine' }]);
  assert.equal(summary.findings.filter((f) => f.kind === 'probe').length, 2);
});

// ---------------------------------------------------------------------------
// buildIssueBody
// ---------------------------------------------------------------------------

const PROBE_RESULTS = [
  { name: 'connectivity', label: 'Database connectivity', url: 'https://example.test/health', status: 'database-down', detail: 'HTTP 503' },
];
const EXPIRY_RESULTS = [{ dbName: 'tais-rag', status: 'expired', daysRemaining: -3, detail: 'passed 3 day(s) ago' }];

test('buildIssueBody: an unhealthy report lists findings and both sections', () => {
  const summary = summarize(PROBE_RESULTS, EXPIRY_RESULTS);
  const body = buildIssueBody(summary, PROBE_RESULTS, EXPIRY_RESULTS, NOW);
  assert.ok(body.includes('finding(s)'));
  assert.ok(body.includes('### Live probes'));
  assert.ok(body.includes('### Managed databases'));
  assert.ok(body.includes('dashboard.render.com'));
  assert.ok(body.includes(NOW.toISOString()));
});

test('buildIssueBody: a healthy report says so plainly', () => {
  const okExpiry = [{ dbName: 'tais-rag', status: 'ok', daysRemaining: 19, detail: 'expires in 19 day(s)' }];
  const okProbes = [{ name: 'connectivity', label: 'Database connectivity', url: 'https://example.test/health', status: 'ok', detail: 'fine' }];
  const body = buildIssueBody(summarize(okProbes, okExpiry), okProbes, okExpiry, NOW);
  assert.ok(body.includes('All database health checks are passing.'));
});

// ---------------------------------------------------------------------------
// publishStatus
// ---------------------------------------------------------------------------

function githubFetchStub({ existingIssues = [], onCall } = {}) {
  const calls = [];
  const fetchImpl = async (url, options = {}) => {
    calls.push({ url, method: options.method || 'GET', body: options.body ? JSON.parse(options.body) : null });
    if (onCall) onCall(url, options);
    if (url.includes('/issues?labels=')) {
      return { ok: true, status: 200, json: async () => existingIssues };
    }
    return { ok: true, status: 200, json: async () => ({ html_url: 'https://github.com/fake/fake/issues/1' }) };
  };
  return { fetchImpl, calls };
}

const UNHEALTHY = { healthy: false, findings: [{ kind: 'probe', name: 'connectivity', status: 'database-down', detail: 'x' }] };
const HEALTHY = { healthy: true, findings: [] };

test('publishStatus: creates the pinned issue on the first unhealthy run', async () => {
  const { fetchImpl, calls } = githubFetchStub();
  const result = await publishStatus('o', 'r', 't', UNHEALTHY, 'body', { fetchImpl });
  assert.equal(result.action, 'created');
  assert.ok(calls.some((c) => c.method === 'POST' && c.body && c.body.title === 'Database health'));
});

test('publishStatus: updates the same issue in place rather than opening a second', async () => {
  const existing = [{ number: 7, state: 'open', title: 'Database health', html_url: 'https://github.com/fake/fake/issues/7' }];
  const { fetchImpl, calls } = githubFetchStub({ existingIssues: existing });
  const result = await publishStatus('o', 'r', 't', UNHEALTHY, 'body', { fetchImpl });
  assert.equal(result.action, 'updated');
  assert.ok(!calls.some((c) => c.method === 'POST' && c.url.endsWith('/issues')));
});

test('publishStatus: reopens the issue if a human closed it while still broken', async () => {
  const existing = [{ number: 7, state: 'closed', title: 'Database health', html_url: 'https://github.com/fake/fake/issues/7' }];
  const { fetchImpl, calls } = githubFetchStub({ existingIssues: existing });
  const result = await publishStatus('o', 'r', 't', UNHEALTHY, 'body', { fetchImpl });
  assert.equal(result.action, 'reopened');
  assert.ok(calls.some((c) => c.method === 'PATCH' && c.body.state === 'open'));
});

test('publishStatus: closes the open issue once everything passes again', async () => {
  const existing = [{ number: 7, state: 'open', title: 'Database health', html_url: 'https://github.com/fake/fake/issues/7' }];
  const { fetchImpl, calls } = githubFetchStub({ existingIssues: existing });
  const result = await publishStatus('o', 'r', 't', HEALTHY, 'body', { fetchImpl });
  assert.equal(result.action, 'closed');
  assert.ok(calls.some((c) => c.method === 'PATCH' && c.body.state === 'closed'));
});

test('publishStatus: a healthy run with no existing issue never creates one', async () => {
  const { fetchImpl, calls } = githubFetchStub();
  const result = await publishStatus('o', 'r', 't', HEALTHY, 'body', { fetchImpl });
  assert.equal(result.action, 'none');
  assert.equal(calls.filter((c) => c.method === 'POST').length, 0);
});

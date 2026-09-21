'use strict';
// Regression tests for tools/deploy-drift/{expected-marker,check}.js — no
// real git history or network access needed; execFn/fetchImpl are both
// injectable, same convention as tests/watchdog.test.js. Ported concept
// from KOS's tests/tools/deploy-drift-*.test.js, adapted for TSO's
// poll-based (not push-based) version of the mechanism -- see
// tools/deploy-drift/README.md for why the two differ.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { expectedMarkerForService } = require('../tools/deploy-drift/expected-marker.js');
const {
  fetchLiveSha,
  evaluateService,
  buildIssueBody,
  publishServiceStatus,
  issueTitle,
  issueLabel
} = require('../tools/deploy-drift/check.js');

const SHA_A = 'a'.repeat(40);
const SHA_B = 'b'.repeat(40);

function fakeFetchJson(ok, status, body) {
  return async () => ({ ok, status, json: async () => body });
}

// ---------------------------------------------------------------------------
// expected-marker.js
// ---------------------------------------------------------------------------

test('expectedMarkerForService parses git log output on the 0x1f field separator', () => {
  const execFn = () => `${SHA_A}\x1fFix the thing\x1f2026-01-01T00:00:00-05:00\n`;
  const result = expectedMarkerForService('tais-registry', { execFn });
  assert.equal(result.sha, SHA_A);
  assert.equal(result.subject, 'Fix the thing');
  assert.equal(result.committedAt, '2026-01-01T00:00:00-05:00');
});

test('expectedMarkerForService returns nulls, not a crash, when a service has no commit history for its paths', () => {
  const execFn = () => '';
  const result = expectedMarkerForService('tais-frontend', { execFn });
  assert.equal(result.sha, null);
});

test('expectedMarkerForService rejects an unknown service name up front, before ever running git', () => {
  let called = false;
  const execFn = () => { called = true; return ''; };
  assert.throws(() => expectedMarkerForService('not-a-real-service', { execFn }), /Unknown service/);
  assert.equal(called, false);
});

// ---------------------------------------------------------------------------
// check.js: fetchLiveSha
// ---------------------------------------------------------------------------

test('fetchLiveSha accepts a valid live response', async () => {
  const service = { versionUrl: 'https://example.test/api/version' };
  const result = await fetchLiveSha(service, fakeFetchJson(true, 200, { sha: SHA_A, source: 'render' }));
  assert.deepEqual(result, { ok: true, sha: SHA_A });
});

test('fetchLiveSha rejects a non-2xx response as unreachable, not a crash', async () => {
  const service = { versionUrl: 'https://example.test/api/version' };
  const result = await fetchLiveSha(service, fakeFetchJson(false, 503, {}));
  assert.equal(result.ok, false);
  assert.ok(result.reason.includes('503'));
});

test('fetchLiveSha rejects a null/missing sha rather than treating it as a match candidate', async () => {
  const service = { versionUrl: 'https://example.test/api/version' };
  const result = await fetchLiveSha(service, fakeFetchJson(true, 200, { sha: null, source: 'unknown' }));
  assert.equal(result.ok, false);
  assert.ok(result.reason.includes('no usable sha'));
});

test('fetchLiveSha rejects a malformed (non-40-hex) sha', async () => {
  const service = { versionUrl: 'https://example.test/api/version' };
  const result = await fetchLiveSha(service, fakeFetchJson(true, 200, { sha: 'not-a-real-sha', source: 'render' }));
  assert.equal(result.ok, false);
});

test('fetchLiveSha reports a network failure as unreachable rather than throwing', async () => {
  const service = { versionUrl: 'https://example.test/api/version' };
  const fetchImpl = async () => { throw new Error('ECONNREFUSED'); };
  const result = await fetchLiveSha(service, fetchImpl);
  assert.equal(result.ok, false);
  assert.ok(result.reason.includes('ECONNREFUSED'));
});

// ---------------------------------------------------------------------------
// check.js: evaluateService
// ---------------------------------------------------------------------------

test('evaluateService reports a match when the live sha equals what git expects', () => {
  const result = evaluateService('tais-registry', { ok: true, sha: SHA_A }, () => ({ sha: SHA_A, subject: 'x', committedAt: 'y' }));
  assert.equal(result.status, 'match');
});

test('evaluateService reports drift when the live sha differs from what git expects', () => {
  const result = evaluateService('tais-registry', { ok: true, sha: SHA_B }, () => ({ sha: SHA_A, subject: 'x', committedAt: 'y' }));
  assert.equal(result.status, 'drift');
  assert.equal(result.reportedSha, SHA_B);
  assert.equal(result.expected.sha, SHA_A);
});

test('evaluateService reports unreachable when the live poll itself failed, without ever consulting git', () => {
  let called = false;
  const result = evaluateService('tais-registry', { ok: false, reason: 'timed out' }, () => { called = true; return { sha: SHA_A }; });
  assert.equal(result.status, 'unreachable');
  assert.equal(result.reason, 'timed out');
  assert.equal(called, false);
});

test('evaluateService reports invalid when git itself has no history for the service', () => {
  const result = evaluateService('tais-registry', { ok: true, sha: SHA_A }, () => ({ sha: null }));
  assert.equal(result.status, 'invalid');
});

// ---------------------------------------------------------------------------
// check.js: buildIssueBody / issueTitle / issueLabel
// ---------------------------------------------------------------------------

test('issueTitle and issueLabel are stable, service-scoped identifiers', () => {
  assert.equal(issueTitle('tais-registry'), 'Deploy drift: tais-registry');
  assert.equal(issueLabel(), 'tso-deploy-drift');
});

test('buildIssueBody names both the expected and reported sha on drift', () => {
  const body = buildIssueBody({
    status: 'drift',
    serviceName: 'tais-registry',
    expected: { sha: SHA_A, subject: 'Fix the thing', committedAt: '2026-01-01T00:00:00Z' },
    reportedSha: SHA_B
  });
  assert.ok(body.includes(SHA_A));
  assert.ok(body.includes(SHA_B));
});

test('buildIssueBody explains an unreachable service without implying a code mismatch', () => {
  const body = buildIssueBody({ status: 'unreachable', serviceName: 'tais-frontend', reason: 'HTTP 503' });
  assert.ok(body.includes('HTTP 503'));
  assert.ok(!body.includes('Git expects'));
});

// ---------------------------------------------------------------------------
// check.js: publishServiceStatus
// ---------------------------------------------------------------------------

test('publishServiceStatus creates the pinned issue on first drift, never on a clean match', async () => {
  const calls = { list: [], create: [] };
  const fetchImpl = async (url, opts = {}) => {
    if (!opts.method) { calls.list.push(url); return { ok: true, json: async () => [] }; }
    if (opts.method === 'POST') {
      calls.create.push(JSON.parse(opts.body));
      return { ok: true, json: async () => ({ number: 1, html_url: 'https://github.com/fake/fake/issues/1' }) };
    }
    return { ok: true, json: async () => ({}) };
  };

  const drift = { status: 'drift', serviceName: 'tais-registry', expected: { sha: SHA_A, subject: 'x', committedAt: 'y' }, reportedSha: SHA_B };
  const driftResult = await publishServiceStatus('o', 'r', 'tok', drift, { fetchImpl });
  assert.equal(driftResult.action, 'created');
  assert.ok(calls.create[0].labels.includes('tso-deploy-drift'));

  calls.create.length = 0;
  const match = { status: 'match', serviceName: 'tais-registry', expected: { sha: SHA_A, subject: 'x', committedAt: 'y' }, reportedSha: SHA_A };
  const matchResult = await publishServiceStatus('o', 'r', 'tok', match, { fetchImpl });
  assert.equal(matchResult.action, 'none');
  assert.equal(calls.create.length, 0);
});

test('publishServiceStatus closes an existing open issue once the service reports clean again', async () => {
  const existing = { number: 4, html_url: 'https://github.com/fake/fake/issues/4', state: 'open', title: issueTitle('tais-registry') };
  const calls = { comment: [], update: [] };
  const fetchImpl = async (url, opts = {}) => {
    if (!opts.method) return { ok: true, json: async () => [existing] };
    if (url.endsWith('/comments')) { calls.comment.push(JSON.parse(opts.body)); return { ok: true, json: async () => ({}) }; }
    calls.update.push(JSON.parse(opts.body));
    return { ok: true, json: async () => ({}) };
  };
  const match = { status: 'match', serviceName: 'tais-registry', expected: { sha: SHA_A, subject: 'x', committedAt: 'y' }, reportedSha: SHA_A };
  const result = await publishServiceStatus('o', 'r', 'tok', match, { fetchImpl });
  assert.equal(result.action, 'closed');
  assert.equal(calls.update[0].state, 'closed');
  assert.ok(calls.comment[0].body.includes(SHA_A));
});

test('publishServiceStatus reopens the pinned issue on renewed drift if a human had closed it', async () => {
  const existing = { number: 8, html_url: 'https://github.com/fake/fake/issues/8', state: 'closed', title: issueTitle('tais-frontend') };
  const calls = { update: [] };
  const fetchImpl = async (url, opts = {}) => {
    if (!opts.method) return { ok: true, json: async () => [existing] };
    calls.update.push(JSON.parse(opts.body));
    return { ok: true, json: async () => ({}) };
  };
  const drift = { status: 'drift', serviceName: 'tais-frontend', expected: { sha: SHA_A, subject: 'x', committedAt: 'y' }, reportedSha: SHA_B };
  const result = await publishServiceStatus('o', 'r', 'tok', drift, { fetchImpl });
  assert.equal(result.action, 'reopened');
  assert.equal(calls.update[0].state, 'open');
});

test('publishServiceStatus never touches an unrelated service\'s pinned issue', async () => {
  const otherServiceIssue = { number: 2, html_url: 'https://github.com/fake/fake/issues/2', state: 'open', title: issueTitle('tais-frontend') };
  const fetchImpl = async (url, opts = {}) => {
    if (!opts.method) return { ok: true, json: async () => [otherServiceIssue] };
    if (opts.method === 'POST') return { ok: true, json: async () => ({ number: 3, html_url: 'https://github.com/fake/fake/issues/3' }) };
    throw new Error('should not PATCH the other service\'s issue');
  };
  const drift = { status: 'drift', serviceName: 'tais-registry', expected: { sha: SHA_A, subject: 'x', committedAt: 'y' }, reportedSha: SHA_B };
  const result = await publishServiceStatus('o', 'r', 'tok', drift, { fetchImpl });
  assert.equal(result.action, 'created');
});

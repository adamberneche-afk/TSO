'use strict';
// Regression tests for tools/doctor/check.js — no real network access
// needed; fetchImpl is injectable, same convention as
// tests/watchdog.test.js and tests/deploy-drift.test.js. Ported concept
// from Mothership's scripts/dev-test-doctor.mjs.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { runDoctor, renderReport, checkVercelToken, checkPresence } = require('../tools/doctor/check.js');

function fakeFetchStatus(status) {
  return async () => ({ ok: status >= 200 && status < 300, status });
}

// ---------------------------------------------------------------------------
// checkVercelToken
// ---------------------------------------------------------------------------

test('checkVercelToken reports "not configured" without ever making a network call', async () => {
  let called = false;
  const fetchImpl = async () => { called = true; return { ok: true, status: 200 }; };
  const result = await checkVercelToken('', fetchImpl);
  assert.equal(result.ok, false);
  assert.equal(result.required, true);
  assert.equal(result.detail, 'not configured');
  assert.equal(called, false);
});

test('checkVercelToken reports valid on a real 2xx from Vercel', async () => {
  const result = await checkVercelToken('a-real-token', fakeFetchStatus(200));
  assert.equal(result.ok, true);
  assert.equal(result.detail, 'valid');
});

test('checkVercelToken reports invalid/expired on a 403, naming the actual failure it maps to', async () => {
  const result = await checkVercelToken('a-stale-token', fakeFetchStatus(403));
  assert.equal(result.ok, false);
  assert.ok(result.detail.includes('403'));
  assert.ok(result.detail.includes('Pull Vercel Environment Information'));
});

test('checkVercelToken reports a network failure as a finding rather than throwing', async () => {
  const fetchImpl = async () => { throw new Error('ENOTFOUND'); };
  const result = await checkVercelToken('a-token', fetchImpl);
  assert.equal(result.ok, false);
  assert.ok(result.detail.includes('ENOTFOUND'));
});

// ---------------------------------------------------------------------------
// checkPresence
// ---------------------------------------------------------------------------

test('checkPresence reports present without claiming the value is verified', () => {
  const result = checkPresence('CRON_SECRET', 'some-value', { required: true, note: 'x' });
  assert.equal(result.ok, true);
  assert.ok(result.detail.includes("can't verify"));
});

test('checkPresence reports not configured for an empty/undefined value', () => {
  const result = checkPresence('CRON_SECRET', undefined, { required: true, note: 'x' });
  assert.equal(result.ok, false);
  assert.equal(result.detail, 'not configured');
});

test('checkPresence carries required through unchanged', () => {
  assert.equal(checkPresence('X', 'v', { required: false }).required, false);
  assert.equal(checkPresence('X', 'v', { required: true }).required, true);
});

// ---------------------------------------------------------------------------
// runDoctor
// ---------------------------------------------------------------------------

test('runDoctor: allOk is true when every required check passes, even if the optional one is unset', async () => {
  const env = { VERCEL_TOKEN: 'tok', VERCEL_URL: 'https://hub.example', CRON_SECRET: 'sekrit' };
  const result = await runDoctor(env, { fetchImpl: fakeFetchStatus(200) });
  assert.equal(result.allOk, true);
  const bypass = result.checks.find((c) => c.label === 'VERCEL_BYPASS_TOKEN');
  assert.equal(bypass.ok, false);
  assert.equal(bypass.required, false);
});

test('runDoctor: allOk is false when a required check fails, regardless of the others', async () => {
  const env = { VERCEL_TOKEN: 'tok', VERCEL_URL: '', CRON_SECRET: 'sekrit' };
  const result = await runDoctor(env, { fetchImpl: fakeFetchStatus(200) });
  assert.equal(result.allOk, false);
});

test('runDoctor: an invalid VERCEL_TOKEN alone is enough to fail the whole run', async () => {
  const env = { VERCEL_TOKEN: 'tok', VERCEL_URL: 'https://hub.example', CRON_SECRET: 'sekrit' };
  const result = await runDoctor(env, { fetchImpl: fakeFetchStatus(401) });
  assert.equal(result.allOk, false);
  assert.equal(result.checks.find((c) => c.label === 'VERCEL_TOKEN').ok, false);
});

test('runDoctor checks all four known secrets, in a stable order', async () => {
  const env = {};
  const result = await runDoctor(env, { fetchImpl: fakeFetchStatus(200) });
  assert.deepEqual(
    result.checks.map((c) => c.label),
    ['VERCEL_TOKEN', 'VERCEL_URL', 'VERCEL_BYPASS_TOKEN', 'CRON_SECRET']
  );
});

// ---------------------------------------------------------------------------
// renderReport
// ---------------------------------------------------------------------------

test('renderReport marks a failed required check with a hard failure symbol, an unset optional one with a softer one', () => {
  const result = {
    allOk: false,
    checks: [
      { label: 'VERCEL_TOKEN', ok: false, required: true, detail: 'not configured' },
      { label: 'VERCEL_BYPASS_TOKEN', ok: false, required: false, detail: 'not configured', note: 'conditional' },
    ],
  };
  const body = renderReport(result);
  assert.ok(body.includes('✗ VERCEL_TOKEN'));
  assert.ok(body.includes('⚠ VERCEL_BYPASS_TOKEN'));
  assert.ok(body.includes('One or more required checks failed'));
});

test('renderReport reports overall success only when allOk is true', () => {
  const result = {
    allOk: true,
    checks: [{ label: 'VERCEL_TOKEN', ok: true, required: true, detail: 'valid' }],
  };
  const body = renderReport(result);
  assert.ok(body.includes('✓ VERCEL_TOKEN'));
  assert.ok(body.includes('All required checks passed.'));
});

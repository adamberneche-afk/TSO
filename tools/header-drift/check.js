#!/usr/bin/env node
// =============================================================================
// header-drift — does the live static site actually serve the response
// headers render.yaml says it does?
//
// WHY THIS EXISTS. render.yaml is NOT synced to Render. The services were
// hand-created in the dashboard and nothing reconciles the file against
// them, so the file is documentation that looks like configuration. On
// 2026-09-20 a single pass found FIVE values in it that disagreed with
// reality -- the service's own name, its start command, its health check
// path, the number of databases, and all three of the frontend's build
// settings -- and three of those had been wrong for months with nothing
// noticing. Two of them would have caused real damage to anyone who
// applied the file as written.
//
// Fixing those five was one-at-a-time work. This closes the loop for the
// subset of render.yaml's claims that can be verified from outside with
// nothing but an HTTP request: response headers.
//
// THE DESIGN PROPERTY THAT MATTERS: expectations are parsed OUT of
// render.yaml at run time rather than hardcoded here. There is deliberately
// no second copy of the expected values to drift from the first. Change
// render.yaml and this check changes with it; that is the whole point, and
// a checker with its own private copy of the truth would just become a
// third thing to reconcile.
//
// Scope, deliberately narrow and stated plainly: this verifies only what is
// observable over plain HTTP from a GitHub runner with no credentials. It
// CANNOT see startCommand, healthCheckPath, plan, autoDeploy, build
// settings, or env var values. Those still need a human against the
// dashboard. Claiming otherwise would be worse than not checking at all.
//
// No pinned issue of its own, on purpose. tools/watchdog already inspects
// every workflow with an `on.schedule` trigger and reports a non-success
// conclusion into its own pinned issue, so a failure here is surfaced
// without a THIRD copy of the GitHub-issue plumbing that db-health and
// deploy-drift each already carry. (db-health's own header notes that
// duplication as worth consolidating one day as its own deliberate
// change; this tool declines to make it worse.)
// =============================================================================

const fs = require('fs');
const path = require('path');
const { SERVICES } = require('../deploy-drift/services.js');

const RENDER_YAML = path.join(__dirname, '..', '..', 'render.yaml');
const REQUEST_TIMEOUT_MS = 20000;

function requestOptions() {
  return typeof AbortSignal !== 'undefined' && AbortSignal.timeout
    ? { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) }
    : {};
}

// ---------------------------------------------------------------------------
// Parsing render.yaml's header declarations
//
// Hand-rolled rather than via a YAML library because these tools carry no
// dependencies -- their workflows do a checkout and run node, with no
// `npm ci` step at all. The slice needed here is small and rigidly shaped,
// which makes that tractable, but it also makes a silent mis-parse the
// obvious failure mode. So: a file that yields NO declarations is treated
// as an error, never as "nothing to check, therefore pass". A checker that
// silently checks nothing is the exact thing this repo keeps getting bitten
// by.
// ---------------------------------------------------------------------------

// render.yaml contains two different `headers:` blocks with different
// shapes: the static site's response headers (path/name/value) and the
// cron job's REQUEST headers (key/value). Only the first kind is a claim
// about what the live site serves, so entries are accepted on shape --
// all three of path, name and value present -- rather than on position.
function parseDeclaredHeaders(yamlText) {
  const lines = yamlText.split('\n');
  const byService = {};

  let inServices = false;
  let currentService = null;
  let headersIndent = null;
  let pending = null;

  const flush = () => {
    if (pending && pending.path && pending.name && pending.value !== undefined && currentService) {
      (byService[currentService] ||= []).push({ ...pending });
    }
    pending = null;
  };

  for (const raw of lines) {
    const line = raw.replace(/\s+$/, '');
    if (!line.trim() || line.trim().startsWith('#')) continue;

    const indent = line.length - line.trimStart().length;
    const trimmed = line.trim();

    // A top-level key (indent 0) ends whatever section we were in.
    if (indent === 0) {
      flush();
      inServices = /^services:/.test(trimmed);
      currentService = null;
      headersIndent = null;
      continue;
    }
    if (!inServices) continue;

    // A new list item at service level starts a new service block.
    if (indent === 2 && trimmed.startsWith('- ')) {
      flush();
      currentService = null;
      headersIndent = null;
    }

    const nameMatch = /^-?\s*name:\s*(.+)$/.exec(trimmed);
    if (nameMatch && headersIndent === null && indent <= 4) {
      currentService = stripQuotes(nameMatch[1]);
      continue;
    }

    if (/^headers:\s*$/.test(trimmed)) {
      flush();
      headersIndent = indent;
      continue;
    }

    // Left the headers block.
    if (headersIndent !== null && indent <= headersIndent) {
      flush();
      headersIndent = null;
    }

    if (headersIndent === null) continue;

    if (trimmed.startsWith('- ')) {
      flush();
      pending = {};
      consumeField(pending, trimmed.slice(2).trim());
      continue;
    }
    if (pending) consumeField(pending, trimmed);
  }
  flush();

  return byService;
}

function consumeField(target, text) {
  const m = /^([A-Za-z_][A-Za-z0-9_-]*):\s*(.*)$/.exec(text);
  if (!m) return;
  const [, key, value] = m;
  if (key === 'path' || key === 'name' || key === 'value') {
    target[key] = stripQuotes(value);
  }
}

function stripQuotes(s) {
  const t = s.trim();
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
    return t.slice(1, -1);
  }
  return t;
}

// ---------------------------------------------------------------------------
// Comparing header values
//
// Exact string equality is the wrong test. A CDN may reorder directives,
// change spacing, or change case, all without changing meaning -- and a
// check that fails on those is a check that gets muted. What matters is
// whether the same set of directives is present.
// ---------------------------------------------------------------------------

function normalizeHeaderValue(value) {
  if (value === null || value === undefined) return null;
  return value
    .split(',')
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean)
    .sort()
    .join(', ');
}

function headerMatches(declared, actual) {
  const a = normalizeHeaderValue(declared);
  const b = normalizeHeaderValue(actual);
  return a !== null && b !== null && a === b;
}

// ---------------------------------------------------------------------------
// Turning a declared path into a URL that can actually be requested
//
// `/index.html` is already concrete. `/assets/*` is not: a wildcard cannot
// be fetched, so a REAL asset the deployed app actually references is
// pulled out of the live index.html. Testing an invented filename would
// prove nothing -- Render's SPA rewrite would serve index.html for a
// non-existent path and the header comparison would silently be measuring
// the wrong resource.
// ---------------------------------------------------------------------------

function resolveConcretePath(declaredPath, indexHtml) {
  if (!declaredPath.includes('*')) return { path: declaredPath };

  const prefix = declaredPath.slice(0, declaredPath.indexOf('*'));
  const pattern = new RegExp(`["'(]?(${escapeRegExp(prefix)}[A-Za-z0-9._-]+)`, 'g');
  const matches = [...(indexHtml || '').matchAll(pattern)].map((m) => m[1]);
  const found = matches.find((p) => !p.endsWith('/'));
  if (!found) {
    return {
      path: null,
      problem:
        `no real resource under "${declaredPath}" is referenced by the live index.html, ` +
        'so this rule cannot be verified against an actual file',
    };
  }
  return { path: found };
}

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ---------------------------------------------------------------------------
// Checking one service
// ---------------------------------------------------------------------------

async function checkService(serviceName, declarations, origin, { fetchImpl = fetch } = {}) {
  const results = [];

  let indexHtml = '';
  const needsWildcard = declarations.some((d) => d.path.includes('*'));
  if (needsWildcard) {
    try {
      const res = await fetchImpl(`${origin}/index.html`, requestOptions());
      indexHtml = res && res.ok ? await res.text() : '';
    } catch {
      indexHtml = '';
    }
  }

  for (const decl of declarations) {
    const resolved = resolveConcretePath(decl.path, indexHtml);
    if (!resolved.path) {
      results.push({
        service: serviceName,
        declaredPath: decl.path,
        header: decl.name,
        status: 'unverifiable',
        detail: resolved.problem,
      });
      continue;
    }

    const url = `${origin}${resolved.path}`;
    let res;
    try {
      res = await fetchImpl(url, requestOptions());
    } catch (err) {
      results.push({
        service: serviceName,
        declaredPath: decl.path,
        header: decl.name,
        url,
        status: 'unreachable',
        detail: `request failed: ${err.message}`,
      });
      continue;
    }

    if (!res.ok) {
      results.push({
        service: serviceName,
        declaredPath: decl.path,
        header: decl.name,
        url,
        status: 'unreachable',
        detail: `HTTP ${res.status}`,
      });
      continue;
    }

    const actual = res.headers && typeof res.headers.get === 'function' ? res.headers.get(decl.name) : null;

    if (actual === null || actual === undefined) {
      results.push({
        service: serviceName,
        declaredPath: decl.path,
        header: decl.name,
        url,
        status: 'missing',
        expected: decl.value,
        actual: null,
        detail: `render.yaml declares ${decl.name}: "${decl.value}" for ${decl.path}, but the live response sends no ${decl.name} header at all`,
      });
      continue;
    }

    if (!headerMatches(decl.value, actual)) {
      results.push({
        service: serviceName,
        declaredPath: decl.path,
        header: decl.name,
        url,
        status: 'mismatch',
        expected: decl.value,
        actual,
        detail: `render.yaml declares ${decl.name}: "${decl.value}" for ${decl.path}, but the live response sends "${actual}"`,
      });
      continue;
    }

    results.push({
      service: serviceName,
      declaredPath: decl.path,
      header: decl.name,
      url,
      status: 'ok',
      expected: decl.value,
      actual,
      detail: `${decl.name} matches`,
    });
  }

  return results;
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

function summarize(results, { declaredCount }) {
  const findings = [];

  // A run that checked nothing is a failure, not a pass. If render.yaml
  // declares no headers at all, either the file lost them or this file's
  // parser stopped understanding it -- and both are worth a red run. The
  // alternative is a permanently green check that verifies nothing, which
  // is the failure mode this repo has already lived through more than once.
  if (declaredCount === 0) {
    findings.push({
      status: 'no-declarations',
      detail:
        'render.yaml declares no response headers for any known service. Either the declarations were ' +
        'removed, or this tool can no longer parse them. Failing rather than reporting a vacuous pass.',
    });
    return { healthy: false, findings, results };
  }

  for (const r of results) {
    if (r.status !== 'ok') findings.push({ status: r.status, detail: r.detail, url: r.url });
  }

  return { healthy: findings.length === 0, findings, results };
}

function report(summary) {
  const lines = ['header-drift -- render.yaml vs live response headers', ''];

  for (const r of summary.results) {
    const mark = r.status === 'ok' ? '✓' : '✗';
    lines.push(`${mark} ${r.service} ${r.declaredPath} [${r.header}]: ${r.status}`);
    lines.push(`   ${r.detail}`);
  }

  if (summary.results.length === 0) lines.push('(no header rules checked)');

  lines.push('');
  if (summary.healthy) {
    lines.push('Live headers match every rule render.yaml declares.');
  } else {
    lines.push(`${summary.findings.length} finding(s):`);
    for (const f of summary.findings) lines.push(`  - ${f.detail}`);
    lines.push('');
    lines.push('render.yaml is NOT synced to Render -- it documents intent, it does not apply it.');
    lines.push('Reconcile in the dashboard (Settings -> Headers), or correct render.yaml if the');
    lines.push('live values are the ones that are right.');
  }
  return lines.join('\n');
}

function originFor(serviceName) {
  const svc = SERVICES[serviceName];
  if (!svc || !svc.versionUrl) return null;
  try {
    return new URL(svc.versionUrl).origin;
  } catch {
    return null;
  }
}

async function run({ yamlText = fs.readFileSync(RENDER_YAML, 'utf8'), fetchImpl = fetch } = {}) {
  const declared = parseDeclaredHeaders(yamlText);
  const results = [];
  let declaredCount = 0;

  for (const [serviceName, declarations] of Object.entries(declared)) {
    declaredCount += declarations.length;
    const origin = originFor(serviceName);
    if (!origin) {
      // Declarations exist for a service this repo has no live URL for.
      // Reported rather than skipped: an unverifiable claim is still an
      // unverified one, and silently dropping it would overstate coverage.
      for (const d of declarations) {
        results.push({
          service: serviceName,
          declaredPath: d.path,
          header: d.name,
          status: 'unverifiable',
          detail: `no live URL known for service "${serviceName}" (add it to tools/deploy-drift/services.js to verify this rule)`,
        });
      }
      continue;
    }
    results.push(...(await checkService(serviceName, declarations, origin, { fetchImpl })));
  }

  return summarize(results, { declaredCount });
}

async function main() {
  const summary = await run();
  console.log(report(summary));
  process.exit(summary.healthy ? 0 : 1);
}

if (require.main === module) main();

module.exports = {
  parseDeclaredHeaders,
  normalizeHeaderValue,
  headerMatches,
  resolveConcretePath,
  checkService,
  summarize,
  report,
  originFor,
  run,
};

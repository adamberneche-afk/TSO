#!/usr/bin/env node
// =============================================================================
// deploy-drift/check — polls each service in tools/deploy-drift/services.js
// for its own self-reported version and compares it against what git
// expects (tools/deploy-drift/expected-marker.js), opening, updating, or
// closing one pinned tracking issue per service.
//
// Ported from the same mechanism already proven in this account's KOS,
// Argoloth, and Mothership repos (see the version of this tool and its
// README at tools/deploy-drift/ in KOS) -- with one real simplification,
// not just a rename: those repos push, because most of their web apps sit
// behind Google's own sign-in wall and an external poll never reaches
// them. Neither Render nor Vercel puts anything in front of the plain
// HTTP endpoints this repo already exposes for this
// (packages/registry/src/routes/version.ts, tais_frontend's built
// /version.json), so this polls them directly on a schedule
// (.github/workflows/deploy-drift.yml) instead of waiting to be told.
// That also means neither deployed service needs to hold a GitHub token of
// any kind -- the only credential in this whole mechanism is the ambient
// GITHUB_TOKEN this workflow already gets from GitHub Actions itself.
//
// Same "pinned issue, update in place, reopen if a human closed it"
// pattern tools/watchdog/check.js already uses.
// =============================================================================

const { SERVICES, knownServiceNames } = require('./services.js');
const { expectedMarkerForService } = require('./expected-marker.js');

const GITHUB_API = 'https://api.github.com';
const SHA_RE = /^[0-9a-f]{40}$/;

function githubHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
}

function issueLabel() {
  return 'tso-deploy-drift';
}
function issueTitle(serviceName) {
  return `Deploy drift: ${serviceName}`;
}

// Polls one service's live version endpoint. Never throws -- a network
// failure, a non-2xx, or a live response with no usable sha are all just
// different reasons the service couldn't be confirmed, reported uniformly
// so evaluateService() can treat them the same way.
async function fetchLiveSha(service, fetchImpl) {
  let res;
  try {
    res = await fetchImpl(service.versionUrl);
  } catch (e) {
    return { ok: false, reason: `could not reach ${service.versionUrl}: ${e.message}` };
  }
  if (!res.ok) {
    return { ok: false, reason: `${service.versionUrl} responded HTTP ${res.status}` };
  }
  let body;
  try {
    body = await res.json();
  } catch (e) {
    return { ok: false, reason: `${service.versionUrl} did not return valid JSON: ${e.message}` };
  }
  if (!body.sha || !SHA_RE.test(body.sha)) {
    return {
      ok: false,
      reason: `${service.versionUrl} reported no usable sha (source: "${body.source || 'unknown'}") -- see that endpoint's own header comment for when this happens`,
    };
  }
  return { ok: true, sha: body.sha };
}

// Pure — no network. Given a live-poll result and a way to look up what
// git expects, decides what happened. Split out from main() so this is
// testable with a fake expectedMarkerFn instead of the real git-backed one.
function evaluateService(serviceName, liveResult, expectedMarkerFn = expectedMarkerForService) {
  if (!liveResult.ok) {
    return { status: 'unreachable', serviceName, reason: liveResult.reason };
  }

  const expected = expectedMarkerFn(serviceName);
  if (!expected.sha) {
    return { status: 'invalid', serviceName, reason: `git has no commit history for service "${serviceName}"'s paths` };
  }

  return expected.sha === liveResult.sha
    ? { status: 'match', serviceName, expected, reportedSha: liveResult.sha }
    : { status: 'drift', serviceName, expected, reportedSha: liveResult.sha };
}

function buildIssueBody(result) {
  const service = SERVICES[result.serviceName];
  const lines = [`**${result.serviceName}** (${service.label}, \`${service.versionUrl}\`)`, ''];

  if (result.status === 'unreachable') {
    lines.push(
      `Could not confirm its live version: ${result.reason}`,
      '',
      'This does not necessarily mean the deploy failed -- it might just mean this check ' +
        "couldn't reach the service. If the service is actually up, check whether its " +
        '`/api/version` or `/version.json` route itself is broken before assuming a real outage.'
    );
  } else {
    lines.push(
      `- Git expects: \`${result.expected.sha}\` (${result.expected.subject}, ${result.expected.committedAt})`,
      `- Live service reported: \`${result.reportedSha}\``,
      '',
      "This usually means either the platform's auto-deploy from `main` hasn't finished " +
        'yet (harmless -- this closes itself on the next scheduled check once it catches ' +
        "up), or it didn't fire at all and needs a look at the Render/Vercel dashboard."
    );
  }

  lines.push('', `_Last checked: ${new Date().toISOString()}_`);
  return lines.join('\n');
}

async function findExistingIssue(owner, repo, token, serviceName, fetchImpl) {
  const res = await fetchImpl(
    `${GITHUB_API}/repos/${owner}/${repo}/issues?labels=${encodeURIComponent(issueLabel())}&state=all&per_page=10`,
    { headers: githubHeaders(token) }
  );
  if (!res.ok) throw new Error(`could not list issues: HTTP ${res.status}`);
  const issues = await res.json();
  return issues.find((issue) => issue.title === issueTitle(serviceName)) || null;
}

// Opens/updates the pinned issue on drift or unreachable; closes it (with a
// resolution comment) if it's currently open and this check is now clean.
// Never creates an issue for a clean report -- a service that has never
// drifted should never have a tracking issue at all.
async function publishServiceStatus(owner, repo, token, result, { fetchImpl = fetch } = {}) {
  const existing = await findExistingIssue(owner, repo, token, result.serviceName, fetchImpl);

  if (result.status === 'drift' || result.status === 'unreachable') {
    const body = buildIssueBody(result);
    if (existing) {
      const wasClosed = existing.state === 'closed';
      const patch = { body };
      if (wasClosed) patch.state = 'open';
      const res = await fetchImpl(`${GITHUB_API}/repos/${owner}/${repo}/issues/${existing.number}`, {
        method: 'PATCH',
        headers: { ...githubHeaders(token), 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error(`could not update issue #${existing.number}: HTTP ${res.status}`);
      return { action: wasClosed ? 'reopened' : 'updated', issueUrl: existing.html_url };
    }
    const res = await fetchImpl(`${GITHUB_API}/repos/${owner}/${repo}/issues`, {
      method: 'POST',
      headers: { ...githubHeaders(token), 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: issueTitle(result.serviceName), body, labels: [issueLabel()] }),
    });
    if (!res.ok) throw new Error(`could not create issue: HTTP ${res.status}`);
    const created = await res.json();
    return { action: 'created', issueUrl: created.html_url };
  }

  // Clean (match) or invalid (no git history to compare against -- a repo
  // config problem, not a live-deploy problem) -- only act if there's an
  // OPEN issue to close.
  if (existing && existing.state === 'open') {
    const commentBody =
      result.status === 'match'
        ? `Resolved: \`${result.expected.sha}\` confirmed live.`
        : `Resolved: ${result.reason}`;
    await fetchImpl(`${GITHUB_API}/repos/${owner}/${repo}/issues/${existing.number}/comments`, {
      method: 'POST',
      headers: { ...githubHeaders(token), 'Content-Type': 'application/json' },
      body: JSON.stringify({ body: commentBody }),
    });
    const res = await fetchImpl(`${GITHUB_API}/repos/${owner}/${repo}/issues/${existing.number}`, {
      method: 'PATCH',
      headers: { ...githubHeaders(token), 'Content-Type': 'application/json' },
      body: JSON.stringify({ state: 'closed' }),
    });
    if (!res.ok) throw new Error(`could not close issue #${existing.number}: HTTP ${res.status}`);
    return { action: 'closed', issueUrl: existing.html_url };
  }
  return { action: 'none', issueUrl: existing ? existing.html_url : null };
}

async function main() {
  const asJson = process.argv.includes('--json');
  const [owner, repo] = (process.env.GITHUB_REPOSITORY || '').split('/');
  const token = process.env.GITHUB_TOKEN;
  const canPublish = Boolean(owner && repo && token);
  if (!canPublish) {
    console.log('GITHUB_REPOSITORY/GITHUB_TOKEN not set -- will still poll and print, but skip publishing issues (local run).');
  }

  const results = [];
  for (const serviceName of knownServiceNames()) {
    const service = SERVICES[serviceName];
    const live = await fetchLiveSha(service, fetch);
    const result = evaluateService(serviceName, live);
    let publishResult = null;
    if (canPublish) {
      publishResult = await publishServiceStatus(owner, repo, token, result);
    }
    results.push({ ...result, publishResult });
  }

  if (asJson) {
    console.log(JSON.stringify(results, null, 2));
  } else {
    for (const result of results) {
      console.log(`[${result.serviceName}] ${result.status}`);
      if (result.publishResult) {
        console.log(`  issue ${result.publishResult.action}${result.publishResult.issueUrl ? ': ' + result.publishResult.issueUrl : ''}`);
      }
    }
  }

  const anyBad = results.some((r) => r.status !== 'match');
  process.exitCode = anyBad ? 1 : 0;
}

if (require.main === module) {
  main().catch((err) => {
    console.error('deploy-drift check failed:', err);
    process.exitCode = 1;
  });
}

module.exports = {
  fetchLiveSha,
  evaluateService,
  buildIssueBody,
  publishServiceStatus,
  issueTitle,
  issueLabel,
  SHA_RE,
};

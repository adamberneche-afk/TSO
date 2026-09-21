#!/usr/bin/env node
// =============================================================================
// db-health/check — answers the one question nothing in this repo was
// asking between 2026-03-24 and 2026-09-20: is the registry's database
// actually working right now?
//
// It had been unreachable that entire time. Every single startup logged
// `P1017` (RAG) and `P1001` (Skills) and carried on serving 503s, and
// `GET /health` -- which runs a real `SELECT 1` and returns 503
// "Database connection failed" when it can't -- would have said so on day
// one to anything that asked. Nothing asked. watchdog watches workflow
// health, deploy-drift watches whether the deployed commit matches git
// (it polls /api/version, which reads env vars and never touches the
// database, so a total database outage leaves it perfectly green). There
// was no check anywhere whose red meant "the product does not work".
// This is that check.
//
// Same shape as tools/deploy-drift/check.js on purpose: poll public
// endpoints the service already exposes, hold no credential but the
// ambient GITHUB_TOKEN, and manage one pinned issue that updates in place
// and closes itself when things recover. The GitHub-issue plumbing below
// is deliberately its own copy rather than shared with deploy-drift or
// watchdog: the three tools open different issues with different
// resolution semantics, and factoring them together would mean editing
// two working, tested tools to add a third. Worth consolidating one day
// as its own deliberate change, not as a side effect of this one.
//
// What this checks, and the failure each one is built to catch:
//   - connectivity (GET /health): the database is reachable at all. A 503
//     here is the exact outage signature described above.
//   - schema      (GET /api/v1/skills?limit=1): real tables exist and
//     answer a real query. A freshly-created, never-migrated database
//     passes connectivity and fails this -- which is precisely the state
//     a recreated database sits in before `prisma migrate deploy` runs.
//   - expiry      (arithmetic on tools/db-health/probes.js): how long until
//     a Render free-tier database expires, and then how long until it is
//     permanently deleted. Those are two different dates separated by a
//     grace period in which upgrading still recovers everything, and this
//     is the check that would have prevented the incident rather than
//     merely detected it.
// =============================================================================

const { PROBES, MANAGED_DATABASES, probeNames, managedDatabaseNames } = require('./probes.js');

const GITHUB_API = 'https://api.github.com';
const MS_PER_DAY = 24 * 60 * 60 * 1000;

// No unattended scheduled job should be able to hang forever on a single
// request. A spun-down free-plan instance can take ~30-60s to answer, so
// this is deliberately generous -- but a request that exceeds it aborts,
// surfaces as a transient failure, and gets the one retry below rather
// than stalling the workflow.
const REQUEST_TIMEOUT_MS = 30000;

// Kept separate so probes can pass it without every test stub having to
// understand AbortSignal -- stubs simply ignore the second argument.
function requestOptions() {
  return typeof AbortSignal !== 'undefined' && AbortSignal.timeout
    ? { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) }
    : {};
}

function githubHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
}

function issueLabel() {
  return 'tso-db-health';
}
function issueTitle() {
  return 'Database health';
}

// Polls GET /health. Never throws: a dead service, a dead database, and a
// service answering something unrecognised are three genuinely different
// situations and the caller needs to be able to tell them apart -- during
// the real outage the service was UP and only the database was down, and a
// check that collapsed those into one "unreachable" would have pointed at
// the wrong thing.
async function probeConnectivity(probe, fetchImpl) {
  let res;
  try {
    res = await fetchImpl(probe.url, requestOptions());
  } catch (e) {
    return {
      status: 'service-unreachable',
      detail: `could not reach ${probe.url}: ${e.message} -- the service itself is not answering, which is a different problem from the database being down`,
    };
  }

  // A 503 is ambiguous and getting it wrong in either direction is costly.
  // routes/health.ts answers 503 with JSON {status:'unhealthy', error:...}
  // when its `SELECT 1` throws -- a real outage. But this service runs on
  // Render's free plan, which spins the instance down after ~15 minutes
  // idle, and the platform answers its own 502/503 (an HTML holding page,
  // not the app) for the ~30-60s a cold start takes. An hourly check that
  // reported every cold start as a database outage would file false alarms
  // most of the day and get muted within a week. So: trust a 503 only when
  // it is the APP's own JSON saying so.
  if (res.status === 503 || res.status === 502) {
    let body = null;
    try {
      body = await res.json();
    } catch {
      body = null;
    }
    if (body && body.status === 'unhealthy') {
      return {
        status: 'database-down',
        detail: `${probe.url} answered HTTP ${res.status} with the app's own {status:"unhealthy"} body -- routes/health.ts returns exactly this when its \`SELECT 1\` throws, so the service is running and its database is not reachable`,
      };
    }
    return {
      status: 'service-waking',
      detail: `${probe.url} answered HTTP ${res.status} without the app's JSON health body -- that is the platform, not the app, and on this free-plan instance it usually means a cold start is in progress`,
    };
  }
  if (!res.ok) {
    return { status: 'unexpected-response', detail: `${probe.url} answered HTTP ${res.status}` };
  }

  let body;
  try {
    body = await res.json();
  } catch (e) {
    return { status: 'unexpected-response', detail: `${probe.url} did not return valid JSON: ${e.message}` };
  }

  const reported = body && body.services && body.services.database;
  if (reported !== 'connected') {
    return {
      status: 'unexpected-response',
      detail: `${probe.url} answered HTTP 200 but reported services.database = ${JSON.stringify(reported)} instead of "connected"`,
    };
  }
  return { status: 'ok', detail: 'connection opened and `SELECT 1` succeeded' };
}

// Polls a real, public, database-backed list route.
//
// Deliberately asserts that the QUERY RAN, not that it returned rows: this
// registry can legitimately be empty, and a check that demanded `total > 0`
// would start failing the moment someone removed the last seeded skill --
// a false alarm, and the fastest way to teach everyone to ignore this tool.
// An empty result from a working schema is a pass.
async function probeSchema(probe, fetchImpl) {
  let res;
  try {
    res = await fetchImpl(probe.url, requestOptions());
  } catch (e) {
    return { status: 'service-unreachable', detail: `could not reach ${probe.url}: ${e.message}` };
  }

  // Same cold-start ambiguity as probeConnectivity: 502/503 on this
  // free-plan instance is the platform waking the service up, not the app
  // failing a query. A 500 is the app itself erroring, which is what an
  // un-migrated database actually looks like from here.
  if (res.status === 502 || res.status === 503) {
    return {
      status: 'service-waking',
      detail: `${probe.url} answered HTTP ${res.status} -- platform-level, typically a cold start on this free-plan instance`,
    };
  }
  if (res.status >= 500) {
    return {
      status: 'query-failed',
      detail: `${probe.url} answered HTTP ${res.status} -- the connection may be fine while the query itself fails, which is what an un-migrated database looks like`,
    };
  }
  if (!res.ok) {
    return { status: 'unexpected-response', detail: `${probe.url} answered HTTP ${res.status}` };
  }

  let body;
  try {
    body = await res.json();
  } catch (e) {
    return { status: 'unexpected-response', detail: `${probe.url} did not return valid JSON: ${e.message}` };
  }

  if (typeof body.total !== 'number') {
    return {
      status: 'unexpected-shape',
      detail: `${probe.url} answered HTTP 200 but had no numeric \`total\` (got ${JSON.stringify(body.total)}) -- skills.ts is documented to return { skills, total, page, limit }`,
    };
  }
  return { status: 'ok', detail: `query executed against real tables (total = ${body.total}; an empty registry is still a pass)` };
}

// Pure arithmetic on the committed record in probes.js -- no network.
function evaluateExpiry(dbName, db, now = new Date()) {
  if (!db.expiresAt) {
    return { dbName, status: 'unknown', daysRemaining: null, detail: 'no expiresAt recorded in tools/db-health/probes.js' };
  }
  const expiresAt = new Date(db.expiresAt);
  if (Number.isNaN(expiresAt.getTime())) {
    return { dbName, status: 'unknown', daysRemaining: null, detail: `expiresAt "${db.expiresAt}" is not a valid date` };
  }

  // Expiry is not deletion. Render holds an expired free instance for a
  // documented grace period, during which upgrading to a paid plan
  // restores it with all data intact -- see probes.js for the full
  // lifecycle. `graceDays` absent or 0 means treat expiry as immediate
  // deletion, which is the pessimistic reading and the safe default for a
  // provider whose grace behaviour we have not confirmed.
  const graceDays = db.graceDays ?? 0;
  const deletesAt = new Date(expiresAt.getTime() + graceDays * MS_PER_DAY);

  const daysRemaining = Math.floor((expiresAt.getTime() - now.getTime()) / MS_PER_DAY);
  const daysUntilDeletion = Math.floor((deletesAt.getTime() - now.getTime()) / MS_PER_DAY);
  const base = { dbName, daysRemaining, daysUntilDeletion, deletesAt: deletesAt.toISOString() };

  // Past the grace period: the instance and its data are gone. Nothing to
  // recover, so the only honest advice is recreate-and-remigrate.
  if (daysUntilDeletion < 0) {
    return {
      ...base,
      status: 'deleted',
      detail:
        `recorded expiry ${db.expiresAt} passed ${Math.abs(daysRemaining)} day(s) ago, and the ` +
        `${graceDays}-day grace period ended ${Math.abs(daysUntilDeletion)} day(s) ago on ` +
        `${base.deletesAt} -- the instance and all its data are gone`,
    };
  }

  // Expired but still inside the grace window. This is the one state where
  // paying fixes everything, and it is time-boxed, so it says so in the
  // detail line rather than leaving the reader to infer it.
  if (daysRemaining < 0) {
    return {
      ...base,
      status: 'in-grace',
      detail:
        `recorded expiry ${db.expiresAt} passed ${Math.abs(daysRemaining)} day(s) ago, but the ` +
        `${graceDays}-day grace period runs until ${base.deletesAt} -- ${daysUntilDeletion} day(s) ` +
        `left to recover it intact by upgrading to a paid plan, after which it is deleted permanently`,
    };
  }

  if (daysRemaining <= (db.warnWithinDays ?? 0)) {
    return {
      ...base,
      status: 'expiring-soon',
      detail: `expires in ${daysRemaining} day(s), on ${db.expiresAt} (then ${graceDays} day(s) of grace, deleted ${base.deletesAt})`,
    };
  }
  return {
    ...base,
    status: 'ok',
    detail: `expires in ${daysRemaining} day(s), on ${db.expiresAt} (then ${graceDays} day(s) of grace, deleted ${base.deletesAt})`,
  };
}

// The part that turns three independent signals into an actual diagnosis.
//
// A past-expiry record means three completely different things depending
// on how far past it is and whether the database still answers, and
// saying the wrong one sends whoever reads the issue in the wrong
// direction at the one moment it is most expensive:
//   - in grace AND the probes are failing -> the expiry is almost
//     certainly the cause, AND the data is still fully recoverable by
//     upgrading to a paid plan, but only until a stated deadline. This is
//     the most time-sensitive thing this tool can report, so the finding
//     leads with the deadline rather than the diagnosis.
//   - past grace AND the probes are failing -> the same cause, but the
//     recovery window is gone. Recreate and re-migrate; anything not
//     separately backed up is lost.
//   - past expiry AND the probes are healthy -> the RECORD is wrong, not
//     the database. Someone recreated or upgraded it without updating
//     probes.js, which means every "expires in N days" warning this tool
//     prints is now fiction. That is a real finding about this tool's own
//     data, and it stays loud until someone fixes the file.
function summarize(probeResults, expiryResults) {
  const findings = [];

  const probesFailing = probeResults.filter((p) => p.status !== 'ok');
  // Two distinct past-expiry states, deliberately not collapsed: inside
  // the grace period the data is still recoverable by upgrading, past it
  // the data is gone. They call for opposite actions.
  const inGrace = expiryResults.filter((e) => e.status === 'in-grace');
  const deleted = expiryResults.filter((e) => e.status === 'deleted');
  const expiringSoon = expiryResults.filter((e) => e.status === 'expiring-soon');
  const unknownExpiry = expiryResults.filter((e) => e.status === 'unknown');

  for (const probe of probesFailing) {
    findings.push({ kind: 'probe', name: probe.name, status: probe.status, detail: probe.detail });
  }

  // Expired-but-recoverable. If the probes are also failing this is almost
  // certainly why -- and unlike every other failure this tool reports,
  // there is a deadline attached to fixing it, so the finding leads with
  // that rather than with diagnosis.
  for (const exp of inGrace) {
    if (probesFailing.length > 0) {
      findings.push({
        kind: 'expiry',
        name: exp.dbName,
        status: 'in-grace-and-failing',
        detail: `${exp.detail}. The live probes above are failing, which is consistent with an expired instance. ACT BEFORE ${exp.deletesAt}: upgrading to a paid plan within the grace window restores it with all data intact. After that it is deleted permanently and, because free instances have no backups of any kind, unrecoverable.`,
      });
    } else {
      findings.push({
        kind: 'expiry',
        name: exp.dbName,
        status: 'stale-record',
        detail: `${exp.detail} -- but every live probe is healthy, so the database is clearly still alive and it is this record that is wrong. Update \`expiresAt\` for "${exp.dbName}" in tools/db-health/probes.js; until then every expiry warning from this tool is meaningless.`,
      });
    }
  }

  for (const exp of deleted) {
    if (probesFailing.length > 0) {
      findings.push({
        kind: 'expiry',
        name: exp.dbName,
        status: 'deleted-and-failing',
        detail: `${exp.detail} -- and the live probes above are failing, so this is the most likely cause. The grace period for recovering it by upgrading has passed; it has to be recreated and re-migrated, and any data not separately backed up is gone.`,
      });
    } else {
      findings.push({
        kind: 'expiry',
        name: exp.dbName,
        status: 'stale-record',
        detail: `${exp.detail} -- but every live probe is healthy, so the database is clearly still alive and it is this record that is wrong. Update \`expiresAt\` for "${exp.dbName}" in tools/db-health/probes.js; until then every expiry warning from this tool is meaningless.`,
      });
    }
  }

  for (const exp of expiringSoon) {
    findings.push({
      kind: 'expiry',
      name: exp.dbName,
      status: 'expiring-soon',
      detail: `${exp.detail}. Upgrading to a paid plan before then avoids the whole problem; recreating it instead loses all data unless it is backed up first, because free instances get no backups of any kind. This is the warning that did not exist the last time, when the database simply vanished.`,
    });
  }

  for (const exp of unknownExpiry) {
    findings.push({ kind: 'expiry', name: exp.dbName, status: 'unknown', detail: exp.detail });
  }

  return { healthy: findings.length === 0, findings };
}

function buildIssueBody(summary, probeResults, expiryResults, now = new Date()) {
  const lines = [];

  if (summary.healthy) {
    lines.push('All database health checks are passing.', '');
  } else {
    lines.push(`${summary.findings.length} finding(s):`, '');
    for (const finding of summary.findings) {
      lines.push(`- **${finding.name}** (${finding.status}): ${finding.detail}`);
    }
    lines.push('');
  }

  lines.push('### Live probes', '');
  for (const probe of probeResults) {
    const mark = probe.status === 'ok' ? '✅' : '❌';
    lines.push(`- ${mark} **${probe.label}** (\`${probe.url}\`) — ${probe.status}: ${probe.detail}`);
  }

  lines.push('', '### Managed databases', '');
  for (const exp of expiryResults) {
    const db = MANAGED_DATABASES[exp.dbName];
    const mark = exp.status === 'ok' ? '✅' : '⚠️';
    lines.push(`- ${mark} **${exp.dbName}** (${db.label}, plan \`${db.plan}\`) — ${exp.detail}`);
    lines.push(`  - Dashboard: ${db.dashboardUrl}`);
  }

  lines.push('', `_Last checked: ${now.toISOString()}_`);
  return lines.join('\n');
}

async function findExistingIssue(owner, repo, token, fetchImpl) {
  const res = await fetchImpl(
    `${GITHUB_API}/repos/${owner}/${repo}/issues?labels=${encodeURIComponent(issueLabel())}&state=all&per_page=10`,
    { headers: githubHeaders(token) }
  );
  if (!res.ok) throw new Error(`could not list issues: HTTP ${res.status}`);
  const issues = await res.json();
  return issues.find((issue) => issue.title === issueTitle()) || null;
}

// Opens/updates the pinned issue when anything is wrong; closes it with a
// resolution comment once everything passes again. Never opens an issue
// for a healthy run.
async function publishStatus(owner, repo, token, summary, body, { fetchImpl = fetch } = {}) {
  const existing = await findExistingIssue(owner, repo, token, fetchImpl);

  if (!summary.healthy) {
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
      body: JSON.stringify({ title: issueTitle(), body, labels: [issueLabel()] }),
    });
    if (!res.ok) throw new Error(`could not create issue: HTTP ${res.status}`);
    const created = await res.json();
    return { action: 'created', issueUrl: created.html_url };
  }

  if (existing && existing.state === 'open') {
    await fetchImpl(`${GITHUB_API}/repos/${owner}/${repo}/issues/${existing.number}/comments`, {
      method: 'POST',
      headers: { ...githubHeaders(token), 'Content-Type': 'application/json' },
      body: JSON.stringify({ body: 'Resolved: every database health check is passing again.' }),
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

// Statuses that mean "ask again in a moment", not "something is broken":
// the free-plan instance is asleep and waking up, or the single request
// happened to land during that window.
const TRANSIENT = new Set(['service-waking', 'service-unreachable']);

const COLD_START_WAIT_MS = 45000;

const defaultSleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Runs each probe, retrying ONCE after a wait if the first attempt looks
// like a cold start rather than a fault. A free-plan Render instance takes
// roughly 30-60s to wake, and the first request is what wakes it -- so the
// retry is not papering over flakiness, it is the request that actually
// gets a real answer. Exactly one retry: a second failure is real, and an
// hourly check that kept retrying would just take longer to tell the truth.
async function runProbes({ fetchImpl = fetch, sleepFn = defaultSleep, waitMs = COLD_START_WAIT_MS } = {}) {
  const results = [];
  for (const name of probeNames()) {
    const probe = PROBES[name];
    const run = () => (name === 'connectivity' ? probeConnectivity(probe, fetchImpl) : probeSchema(probe, fetchImpl));

    let outcome = await run();
    if (TRANSIENT.has(outcome.status)) {
      await sleepFn(waitMs);
      const retried = await run();
      outcome = TRANSIENT.has(retried.status)
        ? { ...retried, detail: `${retried.detail} (still failing ${Math.round(waitMs / 1000)}s after a first attempt that looked like a cold start, so this is not just a sleeping instance)` }
        : retried;
    }
    results.push({ name, label: probe.label, url: probe.url, ...outcome });
  }
  return results;
}

function runExpiryChecks(now = new Date()) {
  return managedDatabaseNames().map((name) => evaluateExpiry(name, MANAGED_DATABASES[name], now));
}

async function main() {
  const asJson = process.argv.includes('--json');
  const [owner, repo] = (process.env.GITHUB_REPOSITORY || '').split('/');
  const token = process.env.GITHUB_TOKEN;
  const canPublish = Boolean(owner && repo && token);
  if (!canPublish) {
    console.log('GITHUB_REPOSITORY/GITHUB_TOKEN not set -- will still probe and print, but skip publishing issues (local run).');
  }

  const now = new Date();
  const probeResults = await runProbes();
  const expiryResults = runExpiryChecks(now);
  const summary = summarize(probeResults, expiryResults);
  const body = buildIssueBody(summary, probeResults, expiryResults, now);

  let publishResult = null;
  if (canPublish) {
    publishResult = await publishStatus(owner, repo, token, summary, body);
  }

  if (asJson) {
    console.log(JSON.stringify({ summary, probeResults, expiryResults, publishResult }, null, 2));
  } else {
    console.log('db-health -- registry database\n');
    for (const probe of probeResults) {
      console.log(`${probe.status === 'ok' ? '✓' : '✗'} ${probe.label}: ${probe.status}`);
      console.log(`   ${probe.detail}`);
    }
    for (const exp of expiryResults) {
      console.log(`${exp.status === 'ok' ? '✓' : '⚠'} ${exp.dbName} expiry: ${exp.detail}`);
    }
    console.log('');
    console.log(summary.healthy ? 'All database health checks passed.' : `${summary.findings.length} finding(s) -- see above.`);
    if (publishResult) {
      console.log(`issue ${publishResult.action}${publishResult.issueUrl ? ': ' + publishResult.issueUrl : ''}`);
    }
  }

  process.exitCode = summary.healthy ? 0 : 1;
}

if (require.main === module) {
  main().catch((err) => {
    console.error('db-health check failed:', err);
    process.exitCode = 1;
  });
}

module.exports = {
  probeConnectivity,
  probeSchema,
  evaluateExpiry,
  summarize,
  buildIssueBody,
  publishStatus,
  runProbes,
  runExpiryChecks,
  issueTitle,
  issueLabel,
};

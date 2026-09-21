#!/usr/bin/env node
// =============================================================================
// watchdog — scheduled-job watchdog for this repo.
//
// health-report.yml, issue-export.yml, weekly-insights.yml, and codeql.yml
// all run on a schedule with nothing checking whether any of those runs
// actually succeeded, or whether the workflow file itself is even valid —
// the second, more dangerous failure mode: an unparseable workflow file
// produces no run at all, not even a failing one, so there's no red X to
// eventually notice. This repo already lived that exact incident once: a
// single commit ("github token usage added") broke the indentation of
// test.yml, health-report.yml, deploy.yml, and rcrt-release.yml at the same
// time, and all four sat silently invalid for months before anyone noticed.
// Ported from the same watchdog already running in this account's KOS,
// Argoloth, and Mothership repos.
//
// Two checks, one pinned issue (updated in place on every run, never a
// fresh issue each time):
//   1. actionlint against every .github/workflows/*.yml file — catches
//      both plain YAML errors and GitHub-Actions-expression-context
//      errors a generic YAML parser would miss.
//   2. For every workflow file with an `on.schedule` trigger: whether the
//      workflow itself is still 'active' (GitHub auto-disables one after
//      60 days of repo inactivity, or a human can disable it manually --
//      either way it then never fires again, silently), the most recent
//      scheduled run's conclusion via the Actions REST API, and whether
//      that run happened suspiciously long ago relative to the workflow's
//      own cron interval (a schedule can silently stop firing even while
//      its last real run still shows 'success').
//
// No dependencies beyond Node's own built-ins + global fetch (Node 20+) —
// this repo's root package.json carries none for GitHub API access, so
// calls go through plain fetch rather than a client library (matching
// KOS's/Argoloth's tools/watchdog/check.js; Mothership's own equivalent
// uses @octokit/rest only because that's already a Mothership dependency).
//
// Usage:
//   node tools/watchdog/check.js            human-readable report
//   node tools/watchdog/check.js --json     machine-readable report
// Exit code is 1 if any finding exists, 0 otherwise. In CI, also publishes
// a pinned "TSO Scheduled-Job Watchdog" issue (needs GITHUB_TOKEN,
// GITHUB_REPOSITORY — both auto-provided by GitHub Actions).
// =============================================================================

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const WORKFLOWS_DIR = path.join(__dirname, '..', '..', '.github', 'workflows');
const WATCHDOG_ISSUE_LABEL = 'tso-watchdog';
const WATCHDOG_ISSUE_TITLE = 'TSO Scheduled-Job Watchdog';
const GITHUB_API = 'https://api.github.com';

function listWorkflowFiles(dir = WORKFLOWS_DIR) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((f) => f.endsWith('.yml') || f.endsWith('.yaml')).sort();
}

// True if the file's own `on:` block declares a `schedule:` trigger — a
// plain string check, not a YAML parse, deliberately: this needs to keep
// working even for a workflow file actionlint has already flagged as
// invalid, so an already-broken file isn't silently skipped by the
// run-conclusion check too (it just won't have a run history to report on).
function hasScheduleTrigger(fileContent) {
  return /^\s*schedule:\s*$/m.test(fileContent);
}

// Runs actionlint against every workflow file in one pass. Returns a map of
// filename -> array of finding strings (empty array = clean). `execFn` is
// injectable so tests don't need the real actionlint binary on the test
// runner's PATH — the CI workflow that actually runs this installs it.
function runActionlint(dir = WORKFLOWS_DIR, { actionlintBin = 'actionlint', execFn = execFileSync } = {}) {
  const results = {};
  for (const f of listWorkflowFiles(dir)) results[f] = [];
  try {
    execFn(actionlintBin, [], { cwd: path.join(__dirname, '..', '..'), encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    return results; // exit 0 — every file clean
  } catch (e) {
    // A failure to even spawn actionlint (binary missing from PATH, no
    // exec permission, etc) has no stdout/stderr in actionlint's own
    // "file:line: message" shape - treating that silence as "every file
    // is clean" would be a false negative exactly as dangerous as the
    // invalid-workflow-file gap this tool exists to catch. Surface it as
    // a finding on every file instead of swallowing it.
    if (e.code === 'ENOENT' || (!e.stdout && !e.stderr)) {
      const reason = `could not run actionlint (${e.code || e.message}) - is it installed and on PATH?`;
      for (const f of Object.keys(results)) results[f].push(reason);
      return results;
    }
    const output = `${e.stdout || ''}${e.stderr || ''}`;
    for (const line of output.split('\n')) {
      const m = line.match(/^\.github\/workflows\/([^:]+):/);
      if (m && results[m[1]] !== undefined) results[m[1]].push(line.trim());
    }
    return results;
  }
}

function githubHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28'
  };
}

function extractCronExpression(fileContent) {
  const m = fileContent.match(/cron:\s*['"]([^'"]+)['"]/);
  return m ? m[1] : null;
}

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

// Best-effort estimate of the expected interval between runs from a
// 5-field cron expression -- used only to flag "this hasn't run in far
// longer than its own schedule would ever produce", not a full cron
// parser. Returns null (skip the staleness check entirely) rather than
// guessing wrong for any shape it doesn't confidently recognize (this
// repo's own schedules are all daily or single-weekday-weekly, which this
// covers exactly).
function estimateCronIntervalMs(cronExpr) {
  const parts = cronExpr.trim().split(/\s+/);
  if (parts.length !== 5) return null;
  const [min, hour, dom, month, dow] = parts;

  if (month !== '*') return null; // yearly/complex -- don't guess

  const stepOf = (field) => {
    const m = field.match(/^\*\/(\d+)$/);
    return m ? parseInt(m[1], 10) : null;
  };
  const isPlainValue = (field) => field !== '*' && !field.includes(',') && !field.includes('/');

  const minStep = stepOf(min);
  if (minStep) return minStep * MINUTE_MS;

  const hourStep = stepOf(hour);
  if (hourStep && isPlainValue(min)) return hourStep * HOUR_MS;

  if (dom !== '*') {
    return dow === '*' ? 30 * DAY_MS : null; // both restricted -- ambiguous
  }

  if (dow !== '*') {
    const days = dow.split(',');
    return Math.round((7 * DAY_MS) / days.length);
  }

  if (isPlainValue(hour)) return DAY_MS;

  return null;
}

// `fetchImpl`/`now` are injectable (same convention as octokitFactory
// elsewhere in this account) so tests never make a real network call or
// depend on wall-clock time.
async function checkScheduledWorkflowRuns(owner, repo, token, { dir = WORKFLOWS_DIR, fetchImpl = fetch, now = () => new Date() } = {}) {
  const findings = [];
  for (const f of listWorkflowFiles(dir)) {
    const content = fs.readFileSync(path.join(dir, f), 'utf8');
    if (!hasScheduleTrigger(content)) continue;

    // GitHub auto-disables a scheduled workflow after 60 days of repo
    // inactivity (state becomes 'disabled_inactivity', or a human can
    // disable one manually) -- it then silently never fires again, with
    // no failing run to notice; the run-history check below only ever
    // sees whatever the last run before that was, however long ago.
    try {
      const stateRes = await fetchImpl(
        `${GITHUB_API}/repos/${owner}/${repo}/actions/workflows/${f}`,
        { headers: githubHeaders(token) }
      );
      if (stateRes.ok) {
        const workflow = await stateRes.json();
        if (workflow.state && workflow.state !== 'active') {
          findings.push({ file: f, issue: `workflow is not active (state: '${workflow.state}') -- it will never fire on schedule until re-enabled` });
        }
      }
    } catch {
      // Best-effort only -- the run-history check below still runs
      // regardless of whether this side check succeeded.
    }

    try {
      const res = await fetchImpl(
        `${GITHUB_API}/repos/${owner}/${repo}/actions/workflows/${f}/runs?event=schedule&per_page=1`,
        { headers: githubHeaders(token) }
      );
      if (!res.ok) {
        findings.push({ file: f, issue: `could not check run history: HTTP ${res.status}` });
        continue;
      }
      const data = await res.json();
      const run = (data.workflow_runs || [])[0];
      if (!run) {
        findings.push({ file: f, issue: 'has a schedule trigger but has never had a scheduled run recorded' });
        continue;
      }

      if (run.conclusion && run.conclusion !== 'success') {
        findings.push({ file: f, issue: `last scheduled run concluded '${run.conclusion}' (${run.html_url})` });
      }

      const cronExpr = extractCronExpression(content);
      const intervalMs = cronExpr ? estimateCronIntervalMs(cronExpr) : null;
      if (intervalMs) {
        const runStartedAt = new Date(run.run_started_at || run.created_at).getTime();
        const ageMs = now().getTime() - runStartedAt;
        const staleThresholdMs = 2 * intervalMs;
        if (ageMs > staleThresholdMs) {
          const ageHours = Math.round(ageMs / HOUR_MS);
          findings.push({
            file: f,
            issue: `last scheduled run was ${ageHours}h ago, more than 2x its own schedule interval -- it may have silently stopped firing (${run.html_url})`
          });
        }
      }
    } catch (e) {
      findings.push({ file: f, issue: `could not check run history: ${e.message}` });
    }
  }
  return findings;
}

function buildWatchdogReport({ yamlFindings, runFindings, checkedAt }) {
  const lines = [];
  lines.push(`_Last checked: ${checkedAt}_`, '');

  const yamlBad = Object.entries(yamlFindings).filter(([, errs]) => errs.length > 0);
  lines.push('## Workflow file validity (actionlint)');
  if (yamlBad.length === 0) {
    lines.push('✅ Every `.github/workflows/*.yml` file is valid.');
  } else {
    for (const [file, errs] of yamlBad) {
      lines.push(`- ❌ **${file}**`);
      for (const e of errs) lines.push(`  - \`${e}\``);
    }
  }
  lines.push('');

  lines.push('## Scheduled-run status');
  if (runFindings.length === 0) {
    lines.push("✅ Every scheduled workflow's most recent run concluded successfully.");
  } else {
    for (const f of runFindings) lines.push(`- ❌ **${f.file}** — ${f.issue}`);
  }

  return lines.join('\n');
}

async function findExistingWatchdogIssue(owner, repo, token, fetchImpl) {
  const res = await fetchImpl(
    `${GITHUB_API}/repos/${owner}/${repo}/issues?labels=${encodeURIComponent(WATCHDOG_ISSUE_LABEL)}&state=all&per_page=10`,
    { headers: githubHeaders(token) }
  );
  if (!res.ok) throw new Error(`could not list issues: HTTP ${res.status}`);
  const issues = await res.json();
  return issues.find((issue) => issue.title === WATCHDOG_ISSUE_TITLE) || null;
}

// Same update-in-place pattern the hub's own health-report.js/watchdog.js
// use — one pinned issue, reopened if a human closed it, never a fresh
// issue per run.
async function publishWatchdogReport(owner, repo, token, body, { fetchImpl = fetch } = {}) {
  const existing = await findExistingWatchdogIssue(owner, repo, token, fetchImpl);
  if (existing) {
    const wasClosed = existing.state === 'closed';
    const patch = { body };
    if (wasClosed) patch.state = 'open';
    const res = await fetchImpl(`${GITHUB_API}/repos/${owner}/${repo}/issues/${existing.number}`, {
      method: 'PATCH',
      headers: { ...githubHeaders(token), 'Content-Type': 'application/json' },
      body: JSON.stringify(patch)
    });
    if (!res.ok) throw new Error(`could not update issue #${existing.number}: HTTP ${res.status}`);
    return { action: wasClosed ? 'reopened' : 'updated', issueUrl: existing.html_url };
  }
  const res = await fetchImpl(`${GITHUB_API}/repos/${owner}/${repo}/issues`, {
    method: 'POST',
    headers: { ...githubHeaders(token), 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: WATCHDOG_ISSUE_TITLE, body, labels: [WATCHDOG_ISSUE_LABEL] })
  });
  if (!res.ok) throw new Error(`could not create issue: HTTP ${res.status}`);
  const created = await res.json();
  return { action: 'created', issueUrl: created.html_url };
}

async function main() {
  const asJson = process.argv.includes('--json');
  const yamlFindings = runActionlint();

  const [owner, repo] = (process.env.GITHUB_REPOSITORY || '').split('/');
  const token = process.env.GITHUB_TOKEN;

  let runFindings = [];
  let publishResult = null;
  if (owner && repo && token) {
    runFindings = await checkScheduledWorkflowRuns(owner, repo, token);
    const body = buildWatchdogReport({ yamlFindings, runFindings, checkedAt: new Date().toISOString() });
    publishResult = await publishWatchdogReport(owner, repo, token, body);
  } else {
    console.log('GITHUB_REPOSITORY/GITHUB_TOKEN not set — skipping the run-history check and issue publish (local run).');
  }

  const hasFailures = Object.values(yamlFindings).some((e) => e.length > 0) || runFindings.length > 0;

  if (asJson) {
    console.log(JSON.stringify({ yamlFindings, runFindings, publishResult }, null, 2));
  } else {
    console.log(buildWatchdogReport({ yamlFindings, runFindings, checkedAt: new Date().toISOString() }));
    if (publishResult) console.log(`\nWatchdog report ${publishResult.action}: ${publishResult.issueUrl}`);
  }

  process.exitCode = hasFailures ? 1 : 0;
}

if (require.main === module) {
  main().catch((err) => {
    console.error('Watchdog run failed:', err);
    process.exitCode = 1;
  });
}

module.exports = {
  listWorkflowFiles,
  hasScheduleTrigger,
  extractCronExpression,
  estimateCronIntervalMs,
  runActionlint,
  checkScheduledWorkflowRuns,
  buildWatchdogReport,
  publishWatchdogReport
};

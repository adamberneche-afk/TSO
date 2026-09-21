#!/usr/bin/env node
// =============================================================================
// doctor — pre-flight validation of this repo's deploy-pipeline secrets,
// run on demand (workflow_dispatch only, no schedule -- see below) rather
// than discovered the hard way when something using one of them fails.
//
// Ported from Mothership's scripts/doctor.js, which was built after
// GLOBAL_GITHUB_TOKEN was found to have been silently invalid through 5
// straight scheduled runs, and a spoke repo had been failing 100+ runs on
// a secret that was never set -- both checkable in under a second, and
// nothing before that tool ran either check before something broke in
// production. TSO had the same class of history: the old "Deploy to
// Vercel" Action's "Pull Vercel Environment Information" step had failed
// instantly on every run since at least Feb 2026 (see HANDOFF.md's first
// 2026-09-18 entry) -- this tool's first real run (2026-09-19) confirmed
// why: VERCEL_TOKEN had never actually been set as a repo secret at all.
// That whole deploy path (and the VERCEL_TOKEN check that once lived
// here) is now retired as part of migrating tais_frontend to a Render
// static site (see HANDOFF.md's 2026-09-19 entry) -- Render's own
// autoDeploy needs no GitHub Actions secret of any kind.
//
// Deliberately workflow_dispatch-only (.github/workflows/doctor.yml), not
// scheduled: adding another scheduled job risks the identical "failing
// silently, nobody watching" failure mode this tool exists to catch (the
// same reasoning tools/watchdog/check.js's own header gives for why it
// runs weekly rather than more often, and Mothership's doctor.yml gives
// for running it manually at all). Run this when setting up a new
// credential, rotating one, or troubleshooting a broken deploy step -- not
// on a clock.
//
// What this checks, and why each one stops where it does:
//   - VERCEL_URL / VERCEL_BYPASS_TOKEN / CRON_SECRET: presence only,
//     deliberately not exercised live. Each guards a real side effect --
//     VERCEL_URL+VERCEL_BYPASS_TOKEN is call-hub.yml's endpoint for
//     Mothership's live agent review (see call-hub.yml's own header on
//     the ~1,974-issue incident that already happened from calling it
//     carelessly), CRON_SECRET authenticates
//     POST /admin/cron/weekly-insights, which sends real email (see
//     DEPLOYMENT.md's admin-endpoint cautions) -- firing either just to
//     validate a secret would be worse than the gap this tool closes.
//     Same disclosed limitation Mothership's own secret-presence checks
//     already state: this can confirm a secret with the right NAME
//     exists, never that its VALUE is actually correct.
// =============================================================================

// Presence-only -- see the file header for why none of these three get a
// live call. `required: false` means this repo's own deploy pipeline
// tolerates it being unset (documented as conditional in the workflow that
// uses it), so its absence is reported but doesn't fail the whole run.
function checkPresence(label, value, { required, note }) {
  return {
    label,
    ok: Boolean(value),
    required,
    detail: value ? "present (name only -- this tool can't verify the value is correct)" : 'not configured',
    note,
  };
}

async function runDoctor(env = process.env) {
  const checks = [];
  checks.push(
    checkPresence('VERCEL_URL', env.VERCEL_URL, {
      required: true,
      note: "call-hub.yml's target -- the Mothership hub this repo is a registered spoke of",
    })
  );
  checks.push(
    checkPresence('VERCEL_BYPASS_TOKEN', env.VERCEL_BYPASS_TOKEN, {
      required: false,
      note: 'only needed if the Mothership hub deployment has Vercel Deployment Protection enabled -- see call-hub.yml',
    })
  );
  checks.push(
    checkPresence('CRON_SECRET', env.CRON_SECRET, {
      required: true,
      note: "weekly-insights.yml authenticates to the live registry's /admin/cron/weekly-insights with this",
    })
  );

  const allOk = checks.every((c) => !c.required || c.ok);
  return { checks, allOk };
}

function renderReport(result) {
  const lines = ['TSO doctor -- deploy-pipeline secret pre-flight', ''];
  for (const c of result.checks) {
    const mark = c.ok ? '✓' : c.required ? '✗' : '⚠';
    lines.push(`${mark} ${c.label}: ${c.detail}`);
    if (c.note) lines.push(`   ${c.note}`);
  }
  lines.push('');
  lines.push(result.allOk ? 'All required checks passed.' : 'One or more required checks failed -- see above.');
  return lines.join('\n');
}

if (require.main === module) {
  runDoctor()
    .then((result) => {
      console.log(renderReport(result));
      process.exitCode = result.allOk ? 0 : 1;
    })
    .catch((err) => {
      console.error('doctor run failed:', err);
      process.exitCode = 1;
    });
}

module.exports = { runDoctor, renderReport, checkPresence };

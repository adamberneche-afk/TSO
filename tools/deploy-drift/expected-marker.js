#!/usr/bin/env node
// =============================================================================
// deploy-drift/expected-marker — pure, no network: given a service name,
// runs `git log` over that service's paths (tools/deploy-drift/services.js)
// and returns the most recent commit that touched any of them. This is
// what "what git expects to be live" means for check.js's comparison.
//
// Unlike KOS's version of this file, there is no marker-file exclusion
// here: TSO has nothing analogous to a committed `18_DeployVersionMarker.gs`
// to exclude from its own computation. The registry and frontend both
// generate their reported SHA fresh at build/runtime
// (packages/registry/src/routes/version.ts, tais_frontend/scripts/
// write-version.cjs) from whatever the hosting platform stamps on that
// specific build -- nothing about that value is itself tracked in git, so
// there's no self-reference paradox to work around and no separate
// "commit the code, then commit the marker" ritual required.
// =============================================================================

const { execFileSync } = require('child_process');
const { SERVICES } = require('./services.js');

// Field separator (0x1f, ASCII Unit Separator) rather than a printable
// character -- a commit subject can contain almost anything except this.
//
// `execFn` is injectable (same convention as tools/watchdog/check.js's
// `execFn`) so tests can pin exact git-log output without depending on
// this checkout's own real commit history.
function expectedMarkerForService(serviceName, { execFn = execFileSync } = {}) {
  const service = SERVICES[serviceName];
  if (!service) {
    throw new Error(
      `Unknown service "${serviceName}" -- see tools/deploy-drift/services.js for the known list.`
    );
  }

  let out;
  try {
    out = execFn(
      'git',
      ['log', '-1', '--format=%H%x1f%s%x1f%cI', '--', ...service.gitPaths],
      { encoding: 'utf8' }
    ).trim();
  } catch (e) {
    throw new Error(`git log failed for service "${serviceName}": ${e.message}`);
  }

  if (!out) {
    return { sha: null, subject: null, committedAt: null };
  }
  const [sha, subject, committedAt] = out.split('\x1f');
  return { sha, subject, committedAt };
}

module.exports = { expectedMarkerForService };

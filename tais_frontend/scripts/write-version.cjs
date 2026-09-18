#!/usr/bin/env node
// =============================================================================
// write-version — writes public/version.json before `vite build` runs, so
// the built static site serves its own commit SHA at /version.json.
// tools/deploy-drift/check.js polls that URL directly; no credential of any
// kind needs to exist on Vercel for this to work.
//
// Ported from the same self-reporting pattern already proven in this
// account's KOS/Argoloth/Mothership repos (see tools/deploy-drift/README.md
// at the repo root), and from packages/registry/src/routes/version.ts's
// runtime equivalent for the registry -- this is the same idea, but baked
// into the static build instead of answered by a live server, since a Vite
// SPA has no request-time Node process on Vercel to ask.
//
// The SHA source, in priority order:
//   1. VERCEL_GIT_COMMIT_SHA -- set automatically by Vercel on every build
//      (https://vercel.com/docs/environment-variables/system-environment-variables),
//      no config needed.
//   2. `git rev-parse HEAD` -- fallback for a local build or any other
//      host, using whatever checkout is actually being built.
//   3. null, with source "unknown" -- deliberately not a fake placeholder;
//      a wrong-but-present SHA is worse than an honest gap for a tool whose
//      entire job is catching exactly that kind of mismatch.
//
// Run automatically via package.json's "prebuild" script (npm auto-runs a
// pre<script> hook before <script>) -- `npm run build`/`vercel build` need
// no separate step. Vite copies public/ into dist/ verbatim at build start,
// and Vercel serves a real static file at a matching path before falling
// through to vercel.json's SPA catch-all rewrite, so /version.json is
// reachable directly, not swallowed into index.html.
// =============================================================================

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

function resolveSha() {
  const vercelSha = process.env.VERCEL_GIT_COMMIT_SHA;
  if (vercelSha) return { sha: vercelSha, source: 'vercel' };

  try {
    const sha = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
    if (sha) return { sha, source: 'git' };
  } catch {
    // No .git directory available (e.g. a source-only deploy artifact) --
    // fall through to the honest "unknown" case below rather than throwing
    // and failing the whole build over a non-essential file.
  }

  return { sha: null, source: 'unknown' };
}

function main() {
  const { sha, source } = resolveSha();
  const payload = { sha, source, builtAt: new Date().toISOString() };

  const outDir = path.join(__dirname, '..', 'public');
  const outFile = path.join(outDir, 'version.json');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(outFile, JSON.stringify(payload, null, 2) + '\n');

  console.log(`Wrote ${outFile}: ${JSON.stringify(payload)}`);
}

main();

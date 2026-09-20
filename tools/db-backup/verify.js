#!/usr/bin/env node
// =============================================================================
// db-backup/verify — decides whether a pg_dump actually produced a usable
// backup, before anything downstream is allowed to trust it.
//
// This exists because of the specific, unavoidable shape of backing up a
// Render free-tier Postgres. That plan has NO backups of any kind -- no
// snapshots, no point-in-time recovery, no fork (see
// tools/db-health/probes.js for the full lifecycle). So a dump taken by
// this repo is the only copy of the data that exists anywhere outside the
// live instance. And the moment that matters most is a rotation or a
// recovery, where the live instance is gone and the dump is all there is.
//
// A backup job that reports success while writing an empty or truncated
// file is therefore worse than no backup job at all: it manufactures
// confidence precisely where confidence is most expensive to be wrong
// about. This repo has already lived the unverified-signal failure once --
// `GET /health` answered 503 for six months and nothing asked. The lesson
// applied here is that producing an artifact is not the same as producing
// a backup, and only the second one counts.
//
// What this checks, and the failure each check is built to catch:
//   - the file exists and is non-trivially sized  -> pg_dump wrote nothing,
//     or wrote only a header before dying.
//   - the custom-format magic header is present   -> the file is not a
//     dump at all (a shell error message redirected into it, an HTML
//     error page, a half-written stream).
//   - every expected table name appears in the    -> pg_dump connected and
//     dump's own table-of-contents                   succeeded but against
//                                                    the wrong database, or
//                                                    against one where
//                                                    migrations never ran.
//
// That last check is the one with teeth. A freshly created, never-migrated
// database dumps perfectly happily -- it just contains nothing. That is
// exactly the state a rotation's new instance sits in before
// `prisma migrate deploy` runs, which is exactly when someone might dump
// it over the top of their only good backup.
//
// Deliberately NOT checked: row counts. An empty table is legitimate (the
// registry can genuinely have no skills), and asserting otherwise would
// make the backup job start failing the day someone clears test data --
// the same reasoning tools/db-health's schema probe gives for not
// asserting `total > 0`.
// =============================================================================

const fs = require('fs');

// PostgreSQL custom-format dumps begin with the literal bytes "PGDMP".
// Checking this distinguishes "pg_dump wrote a dump" from "something wrote
// a file", which is the difference between a backup and a text file.
const CUSTOM_FORMAT_MAGIC = 'PGDMP';

// A dump smaller than this cannot plausibly contain a real schema. The
// point is not the exact number -- it is that zero-length and
// header-only files must not pass. pg_dump of even an empty but migrated
// database is comfortably larger than this.
const MIN_PLAUSIBLE_BYTES = 1024;

// Tables that must appear in the dump's table of contents for it to be a
// backup of THIS application's database rather than of an empty or
// unrelated one. Drawn from packages/registry/prisma/schema.prisma's
// @@map() names. Intentionally a small, stable core rather than all 50
// models: this is a sanity check on identity and migration state, not a
// schema-drift detector, and listing every table would make the backup
// job fail on ordinary schema changes.
const EXPECTED_TABLES = ['skills', 'categories', 'tags', 'api_keys', 'audits'];

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KiB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MiB`;
}

// `toc` is the text of `pg_restore --list <file>`: the dump's own
// table of contents. Reading identity out of the dump itself, rather than
// re-querying the database, is the point -- it verifies the artifact that
// would actually be restored, not the server it came from.
function verifyDump({ path, sizeBytes, magic, toc, expectedTables = EXPECTED_TABLES }) {
  const problems = [];
  const checks = [];

  if (sizeBytes === null || sizeBytes === undefined) {
    problems.push(`no file at ${path} -- pg_dump produced nothing`);
    return { ok: false, problems, checks };
  }

  if (sizeBytes < MIN_PLAUSIBLE_BYTES) {
    problems.push(
      `dump is only ${formatBytes(sizeBytes)}, below the ${formatBytes(MIN_PLAUSIBLE_BYTES)} floor -- ` +
      'pg_dump wrote nothing, or died after the header'
    );
  } else {
    checks.push(`size ${formatBytes(sizeBytes)}`);
  }

  if (magic !== CUSTOM_FORMAT_MAGIC) {
    problems.push(
      `file does not start with the "${CUSTOM_FORMAT_MAGIC}" custom-format marker (found ${JSON.stringify(magic)}) -- ` +
      'this is not a pg_dump archive'
    );
  } else {
    checks.push('custom-format header present');
  }

  // Only worth reading the table of contents if the file is a dump at all;
  // otherwise the missing-table errors are noise on top of the real cause.
  if (magic === CUSTOM_FORMAT_MAGIC) {
    const missing = expectedTables.filter((t) => !tocMentionsTable(toc || '', t));
    if (missing.length > 0) {
      problems.push(
        `dump's table of contents is missing expected table(s): ${missing.join(', ')} -- ` +
        'this is what a dump of a never-migrated or wrong database looks like'
      );
    } else {
      checks.push(`all ${expectedTables.length} expected tables present`);
    }
  }

  return { ok: problems.length === 0, problems, checks };
}

// pg_restore --list emits lines like:
//   215; 1259 16428 TABLE public skills tais_rag_user
// Match the table name as a whole word after a TABLE entry, so that a
// table named "skills" is not satisfied by "skill_tags" and vice versa.
function tocMentionsTable(toc, table) {
  const pattern = new RegExp(`\\bTABLE\\b[^\\n]*\\s${escapeRegExp(table)}(\\s|$)`, 'm');
  return pattern.test(toc);
}

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Reads what verifyDump needs from a real file. Split out so the decision
// logic above stays pure and testable without touching a filesystem.
function inspectDump(path, { readFileSync = fs.readFileSync, statSync = fs.statSync } = {}) {
  let sizeBytes = null;
  try {
    sizeBytes = statSync(path).size;
  } catch {
    return { path, sizeBytes: null, magic: null };
  }
  let magic = null;
  try {
    const head = readFileSync(path).subarray(0, CUSTOM_FORMAT_MAGIC.length);
    magic = head.toString('utf8');
  } catch {
    magic = null;
  }
  return { path, sizeBytes, magic };
}

function report(result, path) {
  const lines = [];
  if (result.ok) {
    lines.push(`✓ backup verified: ${path}`);
    for (const c of result.checks) lines.push(`   - ${c}`);
  } else {
    lines.push(`✗ backup FAILED verification: ${path}`);
    for (const p of result.problems) lines.push(`   - ${p}`);
    lines.push('');
    lines.push('Not treating this file as a backup. On the free plan there is no');
    lines.push('other copy, so a bad dump must never be recorded as a good one.');
  }
  return lines.join('\n');
}

function main() {
  const path = process.argv[2];
  const tocPath = process.argv[3];
  if (!path) {
    console.error('usage: verify.js <dump-file> <pg_restore-list-output-file>');
    process.exit(2);
  }
  const inspected = inspectDump(path);
  let toc = '';
  if (tocPath) {
    try {
      toc = fs.readFileSync(tocPath, 'utf8');
    } catch {
      toc = '';
    }
  }
  const result = verifyDump({ ...inspected, toc });
  console.log(report(result, path));
  process.exit(result.ok ? 0 : 1);
}

if (require.main === module) main();

module.exports = {
  verifyDump,
  inspectDump,
  tocMentionsTable,
  report,
  formatBytes,
  EXPECTED_TABLES,
  MIN_PLAUSIBLE_BYTES,
  CUSTOM_FORMAT_MAGIC,
};

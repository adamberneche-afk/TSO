'use strict';
// Regression tests for tools/db-backup/verify.js — no real filesystem and
// no real pg_dump; verifyDump takes plain data and inspectDump's fs calls
// are injectable, the same convention tests/db-health.test.js uses.
//
// The case that matters most is the one that motivated the whole file: a
// dump that is well-formed but taken against a never-migrated database
// must NOT pass. That is a plausible-looking file with none of the data
// in it, and on a plan with no other backups it is the difference between
// a recovery and a loss.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  verifyDump,
  inspectDump,
  tocMentionsTable,
  report,
  formatBytes,
  EXPECTED_TABLES,
  MIN_PLAUSIBLE_BYTES,
  CUSTOM_FORMAT_MAGIC,
} = require('../tools/db-backup/verify.js');

// A table-of-contents line in the shape pg_restore --list actually emits.
function tocLine(table) {
  return `215; 1259 16428 TABLE public ${table} tais_rag_user`;
}
const GOOD_TOC = EXPECTED_TABLES.map(tocLine).join('\n');
const GOOD_DUMP = {
  path: '/tmp/x.dump',
  sizeBytes: 5 * 1024 * 1024,
  magic: CUSTOM_FORMAT_MAGIC,
  toc: GOOD_TOC,
};

// ---------------------------------------------------------------------------
// verifyDump
// ---------------------------------------------------------------------------

test('verifyDump: a well-formed, fully-populated dump passes', () => {
  const result = verifyDump(GOOD_DUMP);
  assert.equal(result.ok, true);
  assert.equal(result.problems.length, 0);
});

test('verifyDump: a missing file fails and says pg_dump produced nothing', () => {
  const result = verifyDump({ path: '/tmp/x.dump', sizeBytes: null, magic: null, toc: '' });
  assert.equal(result.ok, false);
  assert.ok(result.problems[0].includes('produced nothing'));
});

test('verifyDump: a zero-byte file fails', () => {
  const result = verifyDump({ ...GOOD_DUMP, sizeBytes: 0 });
  assert.equal(result.ok, false);
  assert.ok(result.problems.some((p) => p.includes('below the')));
});

test('verifyDump: a header-only truncated dump fails the size floor', () => {
  const result = verifyDump({ ...GOOD_DUMP, sizeBytes: MIN_PLAUSIBLE_BYTES - 1 });
  assert.equal(result.ok, false);
});

test('verifyDump: a file that is not a pg_dump archive fails on the magic bytes', () => {
  // e.g. a shell error message or an HTML error page redirected into the file.
  const result = verifyDump({ ...GOOD_DUMP, magic: '<!DOC' });
  assert.equal(result.ok, false);
  assert.ok(result.problems.some((p) => p.includes('custom-format marker')));
});

// THE case this file exists for.
test('verifyDump: a valid dump of a never-migrated database FAILS on missing tables', () => {
  // pg_dump succeeds happily against an empty database — the file is a real
  // archive, correctly formatted, and contains none of the application's
  // data. This is precisely the state a rotation's fresh instance is in
  // before `prisma migrate deploy` runs.
  const result = verifyDump({ ...GOOD_DUMP, toc: '' });
  assert.equal(result.ok, false);
  const problem = result.problems.find((p) => p.includes('table of contents'));
  assert.ok(problem, 'should report the missing tables');
  assert.ok(problem.includes('never-migrated'), 'should name the likely cause');
  for (const t of EXPECTED_TABLES) assert.ok(problem.includes(t));
});

test('verifyDump: a partially-migrated database fails, naming only what is missing', () => {
  const partial = EXPECTED_TABLES.slice(0, 2).map(tocLine).join('\n');
  const result = verifyDump({ ...GOOD_DUMP, toc: partial });
  assert.equal(result.ok, false);
  const problem = result.problems.find((p) => p.includes('table of contents'));
  assert.ok(problem.includes(EXPECTED_TABLES[2]));
  assert.ok(!problem.includes(`${EXPECTED_TABLES[0]},`), 'present tables are not reported missing');
});

test('verifyDump: a non-archive does not also report missing tables', () => {
  // Cascading errors bury the real cause; the magic-byte failure is the
  // only honest finding when the file is not a dump at all.
  const result = verifyDump({ ...GOOD_DUMP, magic: 'junk!', toc: '' });
  assert.equal(result.ok, false);
  assert.ok(!result.problems.some((p) => p.includes('table of contents')));
});

test('verifyDump: an EMPTY but migrated database still passes -- rows are not asserted', () => {
  // Same reasoning as db-health's schema probe: a registry with no skills
  // is legitimate, and failing on it would make the job cry wolf.
  const result = verifyDump(GOOD_DUMP);
  assert.equal(result.ok, true);
});

// ---------------------------------------------------------------------------
// tocMentionsTable — word-boundary matching
// ---------------------------------------------------------------------------

test('tocMentionsTable: does not let a similarly-named table satisfy another', () => {
  // "skill_tags" must not satisfy a requirement for "skills".
  const toc = tocLine('skill_tags');
  assert.equal(tocMentionsTable(toc, 'skill_tags'), true);
  assert.equal(tocMentionsTable(toc, 'skills'), false);
});

test('tocMentionsTable: a non-TABLE entry mentioning the name does not count', () => {
  const toc = '230; 1259 16500 INDEX public skills_idx tais_rag_user';
  assert.equal(tocMentionsTable(toc, 'skills'), false);
});

test('tocMentionsTable: matches a table at end of line', () => {
  assert.equal(tocMentionsTable('215; 1259 16428 TABLE public skills', 'skills'), true);
});

// ---------------------------------------------------------------------------
// inspectDump — the only part that touches a filesystem
// ---------------------------------------------------------------------------

test('inspectDump: reports null size when the file is absent', () => {
  const result = inspectDump('/nope', {
    statSync: () => { throw new Error('ENOENT'); },
    readFileSync: () => { throw new Error('ENOENT'); },
  });
  assert.equal(result.sizeBytes, null);
  assert.equal(result.magic, null);
});

test('inspectDump: reads size and the leading magic bytes', () => {
  const result = inspectDump('/tmp/x.dump', {
    statSync: () => ({ size: 4096 }),
    readFileSync: () => Buffer.from('PGDMP\u0003\u0000'),
  });
  assert.equal(result.sizeBytes, 4096);
  assert.equal(result.magic, 'PGDMP');
});

// ---------------------------------------------------------------------------
// report
// ---------------------------------------------------------------------------

test('report: a failure explains that no other copy exists', () => {
  const text = report(verifyDump({ ...GOOD_DUMP, sizeBytes: 0 }), '/tmp/x.dump');
  assert.ok(text.startsWith('✗'));
  assert.ok(text.includes('no'));
  assert.ok(text.includes('other copy'));
});

test('report: a pass lists what was actually checked, not just "ok"', () => {
  const text = report(verifyDump(GOOD_DUMP), '/tmp/x.dump');
  assert.ok(text.startsWith('✓'));
  assert.ok(text.includes('custom-format header present'));
  assert.ok(text.includes('expected tables present'));
});

test('formatBytes: renders each magnitude readably', () => {
  assert.equal(formatBytes(512), '512 B');
  assert.equal(formatBytes(2048), '2.0 KiB');
  assert.equal(formatBytes(5 * 1024 * 1024), '5.0 MiB');
});

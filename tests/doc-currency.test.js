'use strict';
// Regression tests for tools/doc-currency/check.js — everything synthetic
// (temp fixtures, injected doc/code/file lists), never the real repo, so a
// legitimate future doc change doesn't make this suite fail. Same
// convention as tests/coverage-gaps.test.js: node:test, node:assert/strict,
// real temp files over mocks where that's more honest.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  isCheckableDoc,
  extractFileCitations,
  extractFunctionCitations,
  checkFileCitation,
  checkFunctionCitation,
  runDocCurrency,
  renderReport,
  IGNORE_MARKER,
  stripIgnoredLines
} = require('../tools/doc-currency/check.js');

// ---------------------------------------------------------------------------
// isCheckableDoc — the exclusion rules
// ---------------------------------------------------------------------------

test('isCheckableDoc excludes dated-record filenames -- naming something removed is what they are FOR', () => {
  assert.equal(isCheckableDoc('HANDOFF.md'), false);
  assert.equal(isCheckableDoc('CHANGELOG.md'), false);
  assert.equal(isCheckableDoc('HISTORY.md'), false);
  assert.equal(isCheckableDoc('lessons.md'), false);
});

test('isCheckableDoc excludes a filename containing a 4-digit year -- a point-in-time snapshot, not a living doc', () => {
  assert.equal(isCheckableDoc('BUG_AUDIT_2026-09.md'), false);
  assert.equal(isCheckableDoc('POST_MORTEM_FEB20_2026.md'), false);
});

test('isCheckableDoc excludes *_PLAN.md/*_PRD.md -- HANDOFF.md itself names these as non-authoritative vision docs', () => {
  assert.equal(isCheckableDoc('THINK_TOKEN_ENGINEERING_PLAN.md'), false);
  assert.equal(isCheckableDoc('RCRT_TAIS_INTEGRATION_PRD.md'), false);
});

test('isCheckableDoc includes an ordinary current-behavior doc', () => {
  assert.equal(isCheckableDoc('DOCS_VS_CODEBASE.md'), true);
  assert.equal(isCheckableDoc('DEPLOYMENT.md'), true);
});

test('isCheckableDoc excludes anything that is not markdown', () => {
  assert.equal(isCheckableDoc('README.txt'), false);
  assert.equal(isCheckableDoc('index.ts'), false);
});

// ---------------------------------------------------------------------------
// extractFileCitations
// ---------------------------------------------------------------------------

test('extractFileCitations requires a slash and a real-looking extension, not a bare backticked word', () => {
  assert.deepEqual(extractFileCitations('See `packages/registry/src/index.ts` for the entry point.'), [
    'packages/registry/src/index.ts'
  ]);
  assert.deepEqual(extractFileCitations('Run `npm run build` first.'), []);
  assert.deepEqual(extractFileCitations('Set `DATABASE_URL` in your env.'), []);
});

test('extractFileCitations rejects an illustrative elided path rather than treating "..." as a real segment', () => {
  assert.deepEqual(extractFileCitations('See `tais_frontend/.../rag/README.md` for detail.'), []);
});

test('extractFileCitations deduplicates repeated citations of the same file', () => {
  assert.deepEqual(extractFileCitations('`a/b.ts` ... later, `a/b.ts` again.'), ['a/b.ts']);
});

// ---------------------------------------------------------------------------
// extractFunctionCitations
// ---------------------------------------------------------------------------

test('extractFunctionCitations matches a bare `name(...)` call', () => {
  assert.deepEqual(extractFunctionCitations('Call `runDoctor()` to check.'), ['runDoctor']);
  assert.deepEqual(extractFunctionCitations("Try `stamp('kos-personal')` first."), ['stamp']);
});

test('extractFunctionCitations does NOT match a method call on an object -- structurally can\'t, not just filtered', () => {
  assert.deepEqual(extractFunctionCitations('Then `array.push(x)` runs.'), []);
  assert.deepEqual(extractFunctionCitations('See `response.json()` for the body.'), []);
});

test('extractFunctionCitations ignores a plain identifier with no call parens', () => {
  assert.deepEqual(extractFunctionCitations('The `CFG` object holds config.'), []);
});

// ---------------------------------------------------------------------------
// stripIgnoredLines — the declared per-line escape hatch
// ---------------------------------------------------------------------------

test('a line carrying the ignore marker has both its file and function citations excluded', () => {
  const content = `See \`routes/tier.ts\` and call \`getTier()\`. <!-- ${IGNORE_MARKER} -- to be built -->`;
  assert.deepEqual(extractFileCitations(content), []);
  assert.deepEqual(extractFunctionCitations(content), []);
});

test('the ignore marker only excludes ITS OWN line, not a citation on the next one', () => {
  const content = `\`routes/tier.ts\` <!-- ${IGNORE_MARKER} -->\ncall \`getTier()\` for real.`;
  assert.deepEqual(extractFileCitations(content), []);
  assert.deepEqual(extractFunctionCitations(content), ['getTier']);
});

test('stripIgnoredLines only blanks the marked line, leaving every other line\'s citations intact', () => {
  const content = `\`a/b.ts\` is real.\n\`c/d.ts\` <!-- ${IGNORE_MARKER} -->  is not checked.`;
  const stripped = stripIgnoredLines(content);
  assert.ok(stripped.includes('a/b.ts'));
  assert.ok(!stripped.includes('c/d.ts'));
});

// ---------------------------------------------------------------------------
// checkFileCitation — the suffix-match resolution
// ---------------------------------------------------------------------------

test('checkFileCitation accepts an exact repo-root-relative match', () => {
  const allFiles = ['packages/registry/src/routes/version.ts'];
  assert.equal(checkFileCitation('packages/registry/src/routes/version.ts', allFiles), true);
});

test('checkFileCitation accepts a path-boundary-safe suffix match -- the real fix for package-relative citations', () => {
  // A doc under packages/registry/ writing `routes/skills.ts` to mean
  // packages/registry/src/routes/skills.ts -- confirmed on this tool's
  // first real run to be this repo's dominant citation style.
  const allFiles = ['packages/registry/src/routes/skills.ts'];
  assert.equal(checkFileCitation('routes/skills.ts', allFiles), true);
});

test('checkFileCitation rejects a citation that is only a PARTIAL path segment, not a real suffix', () => {
  // "outes/skills.ts" must not match ".../routes/skills.ts" -- the match
  // has to land on a real path boundary (a "/"), not an arbitrary
  // character offset.
  const allFiles = ['packages/registry/src/routes/skills.ts'];
  assert.equal(checkFileCitation('outes/skills.ts', allFiles), false);
});

test('checkFileCitation rejects a citation with no matching file anywhere', () => {
  const allFiles = ['packages/registry/src/routes/skills.ts'];
  assert.equal(checkFileCitation('packages/registry/src/routes/tier.ts', allFiles), false);
});

// ---------------------------------------------------------------------------
// checkFunctionCitation
// ---------------------------------------------------------------------------

test('checkFunctionCitation is true if the identifier appears ANYWHERE in the code corpus -- a call site counts, not only a declaration', () => {
  const corpus = [{ relPath: 'a.ts', content: 'export function runDoctor() { return true; }' }];
  assert.equal(checkFunctionCitation('runDoctor', corpus), true);
});

test('checkFunctionCitation matches on a whole word, not a substring of a longer identifier', () => {
  const corpus = [{ relPath: 'a.ts', content: 'function runDoctorInternal() {}' }];
  assert.equal(checkFunctionCitation('runDoctor', corpus), false);
});

test('checkFunctionCitation is false when nothing in the corpus mentions the name at all', () => {
  const corpus = [{ relPath: 'a.ts', content: 'function somethingElse() {}' }];
  assert.equal(checkFunctionCitation('getTier', corpus), false);
});

// ---------------------------------------------------------------------------
// runDocCurrency — end to end with fully injected inputs, no real repo I/O
// ---------------------------------------------------------------------------

test('runDocCurrency reports clean when every citation resolves', () => {
  const fs = require('fs');
  const os = require('os');
  const path = require('path');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tso-doc-currency-test-'));
  const docPath = path.join(dir, 'x.md');
  fs.writeFileSync(docPath, 'See `routes/skills.ts` and call `runDoctor()`.');

  const result = runDocCurrency({
    docFiles: [docPath],
    codeCorpus: [{ relPath: 'a.ts', content: 'function runDoctor() {}' }],
    allFiles: ['packages/registry/src/routes/skills.ts']
  });
  assert.equal(result.hasFindings, false);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('runDocCurrency reports both a missing file and a missing function in one doc', () => {
  const fs = require('fs');
  const os = require('os');
  const path = require('path');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tso-doc-currency-test-'));
  const docPath = path.join(dir, 'x.md');
  fs.writeFileSync(docPath, 'See `routes/tier.ts` and call `getTier()`.');

  const result = runDocCurrency({ docFiles: [docPath], codeCorpus: [], allFiles: [] });
  assert.equal(result.hasFindings, true);
  assert.equal(result.findings.length, 2);
  assert.deepEqual(
    result.findings.map((f) => f.type).sort(),
    ['cited-file-missing', 'cited-function-missing']
  );
  fs.rmSync(dir, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
// renderReport
// ---------------------------------------------------------------------------

test('renderReport names the doc, the kind of citation, and the exact stale token', () => {
  const body = renderReport({
    hasFindings: true,
    findings: [{ type: 'cited-file-missing', doc: 'docs/X.md', cited: 'routes/tier.ts' }]
  });
  assert.ok(body.includes('docs/X.md'));
  assert.ok(body.includes('file'));
  assert.ok(body.includes('routes/tier.ts'));
});

test('renderReport reports clean only when there are truly no findings', () => {
  const body = renderReport({ hasFindings: false, findings: [] });
  assert.ok(body.includes('No stale file or function citations found.'));
});

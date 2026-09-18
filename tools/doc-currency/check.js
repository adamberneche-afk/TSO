#!/usr/bin/env node
// =============================================================================
// doc-currency — catches a doc that cites a function or a file that no
// longer exists in this repo. A narrow slice of KOS's tools/doc-currency
// (14 checks, a whole exclusions taxonomy for an Apps Script codebase's
// addendum files and blocked-GCP-surface prose) — deliberately not a full
// port. KOS's own README is explicit that most of what makes its version
// valuable ("prose accuracy still needs a human") can't be automated at
// all; this ports only the two checks that are cheap, precise, and don't
// need that taxonomy:
//
//   1. cited-file-missing — a doc names a backticked, slash-containing
//      file path that doesn't exist in the repo.
//   2. cited-function-missing — a doc names a backticked, bare
//      `identifier(...)` call that appears NOWHERE in this repo's actual
//      code (any occurrence at all — a definition, a call site, anything
//      — not just a declaration; if the name is truly gone, it won't
//      appear anywhere).
//
// Both are heuristics over text, same as KOS's own version admits to being
// ("treat findings as 'worth a human look,' not certified fact") — a
// citation this tool can't resolve is a real, disclosed limit on what it
// can verify, not a false all-clear. What it does NOT check: whether a
// documented behavior still matches what the code actually does, whether
// a doc is missing something it should cover, or anything about prose
// accuracy. Those need a human reading the doc against the code, the same
// as they do in KOS.
//
// Dated records are excluded wholesale, same principle KOS's version uses
// for CHANGELOG.md/HISTORY.md: naming something that used to exist is
// exactly what a dated handoff/changelog entry is FOR.
// HANDOFF.md in particular is one long, growing, explicitly dated journal
// of exactly that shape — see its own entries for prior sessions' fixes
// naming code that was buggy or missing at the time. Flagging it would be
// flagging the record for being a record.
// =============================================================================

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

// Generated output and vendored dependencies -- excluded from every walk
// this tool does, including the one that answers "does this cited file
// really exist": nothing under these was ever meant to be cited by a doc.
const GENERATED_DIRS = new Set(['node_modules', '.git', 'dist', 'build', 'coverage', '.clasp-build']);

// Explicitly-archived/exported content, already known to be stale by
// design -- excluded from doc-scanning (an archived doc isn't claiming
// currency) and from the code corpus (a function surviving only in
// archived/backup code shouldn't count as "still real"). Deliberately
// NOT excluded from the file-existence check below: files under here
// genuinely still exist on disk and are legitimately cited -- confirmed
// on this tool's first real run, which flagged HANDOFF.md's own pointer
// to `archive/outdated/NORTH_STAR.md` (a real file, read earlier the same
// session this tool was built in) as "missing," purely because this list
// was excluding it from the search too, not because the citation was
// stale.
const STALE_CONTENT_DIRS = new Set(['archive', 'exports', 'tais-frontend-old-backup']);

const EXCLUDE_DIRS = new Set([...GENERATED_DIRS, ...STALE_CONTENT_DIRS]);

// Dated-record filenames, skipped wholesale regardless of directory --
// same reasoning KOS's doc-currency gives for CHANGELOG.md/HISTORY.md:
// naming something that used to exist is exactly what a dated record is
// FOR. A filename containing a 4-digit year (BUG_AUDIT_2026-09.md,
// POST_MORTEM_FEB20_2026.md) is as strong a "this is a point-in-time
// snapshot, not a living doc" signal as an explicit CHANGELOG name.
const DATED_RECORD_FILENAMES = /^(HANDOFF|CHANGELOG|HISTORY|WIP)\.md$/i;
const DATED_RECORD_BASENAMES = new Set(['lessons.md']);
const CONTAINS_YEAR_RE = /\d{4}/;

// HANDOFF.md's own "Key documents to read next" section says this
// explicitly: "Skip archive/outdated/NORTH_STAR.md and the docs/*PLAN.md /
// docs/*PRD.md files as authoritative... they describe the vision, not the
// code, and are now known to overclaim." That is this repo telling future
// readers which docs are aspirational, in its own words -- honored here
// rather than re-deriving the same judgment independently.
const VISION_DOC_RE = /_(PLAN|PRD)\.md$/i;

const CODE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.cjs', '.mjs', '.py', '.rs']);

function walk(dir, predicate, excludeDirs, results = []) {
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') && entry.name !== '.github') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (excludeDirs.has(entry.name)) continue;
      walk(full, predicate, excludeDirs, results);
    } else if (entry.isFile() && predicate(entry.name)) {
      results.push(full);
    }
  }
  return results;
}

function isCheckableDoc(filename) {
  if (!filename.endsWith('.md')) return false;
  if (DATED_RECORD_FILENAMES.test(filename)) return false;
  if (DATED_RECORD_BASENAMES.has(filename.toLowerCase())) return false;
  if (CONTAINS_YEAR_RE.test(filename)) return false;
  if (VISION_DOC_RE.test(filename)) return false;
  return true;
}

function listDocFiles() {
  return walk(ROOT, isCheckableDoc, EXCLUDE_DIRS).map((p) => path.relative(ROOT, p));
}

function isCodeFile(filename) {
  return CODE_EXTENSIONS.has(path.extname(filename));
}

// Read once, reused across every citation in every doc -- the check is
// O(docs x code files) in comparisons but O(code files) in disk reads.
function loadCodeCorpus() {
  const files = walk(ROOT, isCodeFile, EXCLUDE_DIRS);
  return files.map((absPath) => ({
    relPath: path.relative(ROOT, absPath),
    content: fs.readFileSync(absPath, 'utf8'),
  }));
}

// Every real file in the repo, any type, for citation resolution --
// deliberately not scoped to code extensions, since a citation can point
// at a doc, a manifest, a fixture, anything. Only GENERATED_DIRS is
// excluded here, not STALE_CONTENT_DIRS -- an archived/exported file
// genuinely still exists and is a legitimate citation target (see
// STALE_CONTENT_DIRS's own comment). Loaded once per run.
function listAllFiles() {
  return walk(ROOT, () => true, GENERATED_DIRS).map((p) => path.relative(ROOT, p));
}

// Anchored to the backtick span itself, not just "a slash-containing
// string somewhere near backticks" -- requires at least one `/` and a
// trailing extension so a bare word or a shell flag never matches.
const FILE_CITATION_RE = /`([\w.\-]+(?:\/[\w.\-]+)+\.[A-Za-z0-9]+)`/g;

// Anchored the same way: the identifier must start immediately after the
// opening backtick and the call's closing paren must be immediately
// followed by the closing backtick, with nothing else (no leading `.`,
// so a method call like `array.push(x)` structurally can't match --
// the regex engine has nothing to retry from once "array" fails to be
// followed directly by "(").
const FUNCTION_CITATION_RE = /`([A-Za-z_$][\w$]*)\([^`\n)]*\)`/g;

// A line can opt its citations out of this check entirely by carrying this
// literal marker (as a trailing HTML comment, so it renders invisibly) --
// for a citation that is genuinely not "this repo's own file/function
// right now": an instruction to create a file that doesn't exist yet, or
// a deliberate cross-system reference (KOS's own `doGet()` convention,
// cited by name for contrast, not claimed as something this repo has).
// Declared, not inferred -- same philosophy KOS's own `sandboxScope.allow`
// escape hatch uses in its coverage-gaps equivalent: reach for this only
// when the citation is genuinely not this tool's business, and let the
// surrounding prose say why, the same way every use of it in this repo
// does.
const IGNORE_MARKER = 'doc-currency:ignore';

function stripIgnoredLines(content) {
  return content
    .split('\n')
    .map((line) => (line.includes(IGNORE_MARKER) ? '' : line))
    .join('\n');
}

function extractFileCitations(content) {
  const raw = [...new Set([...stripIgnoredLines(content).matchAll(FILE_CITATION_RE)].map((m) => m[1]))];
  // Reject an illustrative/truncated path like `tais_frontend/.../rag/
  // README.md` -- a real elision in the doc's own prose, not a citation of
  // an actual file, and would never resolve against anything real.
  return raw.filter((p) => !p.includes('...'));
}

function extractFunctionCitations(content) {
  return [...new Set([...stripIgnoredLines(content).matchAll(FUNCTION_CITATION_RE)].map((m) => m[1]))];
}

// Docs in this repo routinely cite a file relative to their OWN package's
// `src/` (a doc under packages/registry/ writing `routes/skills.ts` to
// mean packages/registry/src/routes/skills.ts), not the monorepo root --
// confirmed empirically: resolving only against the repo root on this
// tool's first real run flagged the large majority of docs/DOCS_VS_CODEBASE.md's
// citations, every one of which is a real, current file once traced by
// hand. Rather than enumerate every package's own root (a second thing to
// keep in sync as packages are added/renamed), this accepts an exact
// repo-root-relative match OR a path-boundary-safe SUFFIX match against
// any real file in the repo -- deliberately permissive in the same
// direction gas-lint's own column-map check already documents choosing
// ("the alternative... would report a false conflict on every run, which
// is how a check gets muted"). The tradeoff: a citation this loose could
// in principle suffix-match an unintended file if two files in the repo
// happen to share a long common tail -- accepted as the same tradeoff.
function checkFileCitation(citedPath, allFiles) {
  return allFiles.some((real) => real === citedPath || real.endsWith('/' + citedPath));
}

// Whole-word match, not substring -- "run" must not match inside "runner".
function checkFunctionCitation(name, codeCorpus) {
  const re = new RegExp(`\\b${name.replace(/[$]/g, '\\$')}\\b`);
  return codeCorpus.some((f) => re.test(f.content));
}

function runDocCurrency({
  docFiles = listDocFiles(),
  codeCorpus = loadCodeCorpus(),
  allFiles = listAllFiles(),
} = {}) {
  const findings = [];
  for (const docRelPath of docFiles) {
    // path.resolve, not path.join: docRelPath is normally repo-root-relative,
    // but tests inject an absolute temp-file path here, and path.resolve
    // (unlike path.join) correctly treats an already-absolute second
    // argument as the final answer rather than concatenating it onto ROOT.
    const content = fs.readFileSync(path.resolve(ROOT, docRelPath), 'utf8');

    for (const citedPath of extractFileCitations(content)) {
      if (!checkFileCitation(citedPath, allFiles)) {
        findings.push({ type: 'cited-file-missing', doc: docRelPath, cited: citedPath });
      }
    }
    for (const fnName of extractFunctionCitations(content)) {
      if (!checkFunctionCitation(fnName, codeCorpus)) {
        findings.push({ type: 'cited-function-missing', doc: docRelPath, cited: `${fnName}()` });
      }
    }
  }
  return { findings, hasFindings: findings.length > 0 };
}

function renderReport({ findings, hasFindings }) {
  const lines = ['doc-currency -- stale citations', ''];
  if (findings.length === 0) {
    lines.push('No stale file or function citations found.');
  } else {
    for (const f of findings) {
      const what = f.type === 'cited-file-missing' ? 'file' : 'function';
      lines.push(`✗ ${f.doc}: cites ${what} \`${f.cited}\`, not found anywhere in the repo`);
    }
  }
  lines.push('');
  lines.push(
    hasFindings
      ? 'One or more docs cite something that no longer exists -- see above. Treat each as worth a human look, not certified fact.'
      : 'Clean.'
  );
  return lines.join('\n');
}

if (require.main === module) {
  const asJson = process.argv.includes('--json');
  const result = runDocCurrency();
  if (asJson) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(renderReport(result));
  }
  process.exitCode = result.hasFindings ? 1 : 0;
}

module.exports = {
  isCheckableDoc,
  listDocFiles,
  isCodeFile,
  loadCodeCorpus,
  listAllFiles,
  IGNORE_MARKER,
  stripIgnoredLines,
  extractFileCitations,
  extractFunctionCitations,
  checkFileCitation,
  checkFunctionCitation,
  runDocCurrency,
  renderReport,
};

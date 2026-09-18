#!/usr/bin/env node
// =============================================================================
// coverage-gaps — finds a scheduled job's underlying script that either has
// no test anywhere in the repo, or has one that exists on disk but never
// actually runs in CI. Adapted from KOS's tools/coverage-gaps/check.js
// (itself built after sensor1_scanInboundSessions() — a function running
// unattended on a 5-minute trigger — was found to have had zero test
// coverage of any kind for most of that repo's life, discovered only by
// accident).
//
// KOS's version answers "was this Apps Script trigger handler's body ever
// entered", using Node's V8 coverage instrumentation over files loaded into
// a vm sandbox — a real trick needed because GAS has no module system and
// every file sharing a project shares one global scope. TSO doesn't have
// that problem: its scheduled-job scripts are ordinary Node modules with a
// real require() graph, so the equivalent question is answerable by
// resolving that graph directly, without needing coverage instrumentation
// at all.
//
// This is a deliberate reshaping, not a diluted port, of the same underlying
// principle KOS's version encodes -- and it already found a real instance of
// exactly what it's built to catch, while this tool was still being tested
// (see below): scripts/health-analyzer.js (health-report.yml, daily) DOES
// have a real test file -- scripts/__tests__/health-analyzer.test.js, 6
// passing tests exercising every exported function -- but root package.json's
// `"test": "node --test tests/*.test.js && ..."` never reaches it, because
// the shell glob only expands files directly inside tests/. `npm test` has
// been silently skipping it. Same underlying failure class this repo has
// already lived through once (health-analyzer.js's own repo-owner typo going
// unnoticed for months, JWT_SECRET blocking every registry test for weeks) --
// this time a human had already done the work of writing the safety net, and
// nothing wired it in.
//
// Scope, deliberately narrow: only scripts a `schedule:`-triggered GitHub
// Actions workflow invokes as `node <path>.js` (a real file — an inline
// heredoc script, like issue-export.yml's, has no separate file to resolve
// a test against, and isn't flagged as a finding of any kind: a false
// "uncovered" report against code this tool can't actually see into would
// be worse than silence). Same reasoning KOS's own version gives for scoping
// to ScriptApp.newTrigger() handlers rather than every function: an
// unattended job fails silently, for as long as nobody happens to look,
// which is the shape of every incident that motivated this class of tool.
// A manually-dispatched tool (tools/doctor/check.js) is out of scope for the
// same reason it's out of tools/watchdog's scope too — it fails in front of
// whoever runs it.
// =============================================================================

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const WORKFLOWS_DIR = path.join(ROOT, '.github', 'workflows');

// Directories a scheduled-job script could plausibly live in, and where its
// test could plausibly live — but never packages/* or tais_frontend/*, which
// run under Jest/vitest, a wholly separate test command this tool doesn't
// invoke or understand. A gap in either of those belongs to their own
// suite's coverage tooling, not this one.
const WALK_EXCLUDE_DIRS = new Set([
  'node_modules', '.git', 'packages', 'tais_frontend',
  'archive', 'tais-frontend-old-backup', 'dist', 'build', '.clasp-build',
]);

function listWorkflowFiles(dir = WORKFLOWS_DIR) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((f) => f.endsWith('.yml') || f.endsWith('.yaml')).sort();
}

// Same plain-string check tools/watchdog/check.js already uses, deliberately
// not a full YAML parse — see that file's own comment for why.
function hasScheduleTrigger(fileContent) {
  return /^\s*schedule:\s*$/m.test(fileContent);
}

// Every `node <relative/path>.js` invocation anywhere in a workflow's `run:`
// text. Doesn't attempt to parse which step it came from — a script named
// this way anywhere in a schedule-triggered workflow file is in scope.
function extractNodeScriptInvocations(fileContent) {
  // A real script path, bare (`scripts/health-analyzer.js`) or explicitly
  // relative (`./tools/watchdog/check.js`) -- requires at least one `/` so a
  // stray "node something.js" in prose without a real path doesn't match,
  // and `node --test ...`/`node -e ...`/a bare heredoc invocation (no path
  // at all, like issue-export.yml's) correctly find nothing.
  const matches = [...fileContent.matchAll(/\bnode\s+(\.{0,2}\/?[\w.-]+(?:\/[\w.-]+)+\.js)\b/g)];
  return [...new Set(matches.map((m) => m[1]))];
}

// Every schedule-triggered workflow's real, resolvable `node <script>.js`
// invocations — the actual, current set of things this tool checks,
// discovered from source rather than hand-maintained (a hand-maintained
// list is exactly the kind of second file to forget the coverage-gaps
// README already warns about for a different tool's .claspignore).
function findScheduledScripts(dir = WORKFLOWS_DIR) {
  const found = [];
  for (const workflowFile of listWorkflowFiles(dir)) {
    const content = fs.readFileSync(path.join(dir, workflowFile), 'utf8');
    if (!hasScheduleTrigger(content)) continue;
    for (const scriptPath of extractNodeScriptInvocations(content)) {
      found.push({ workflowFile, scriptPath });
    }
  }
  return found;
}

function walkTestFiles(dir, results = []) {
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (WALK_EXCLUDE_DIRS.has(entry.name)) continue;
      walkTestFiles(full, results);
    } else if (entry.isFile() && entry.name.endsWith('.test.js')) {
      results.push(full);
    }
  }
  return results;
}

// Every *.test.js file in scope (see WALK_EXCLUDE_DIRS), repo-root-relative.
function listAllTestFiles() {
  return walkTestFiles(ROOT).map((p) => path.relative(ROOT, p));
}

// Resolves every relative require() in a test file and returns the ones
// that land on `scriptAbsPath` — real require-graph resolution (with/without
// a trailing .js), not a naming-convention guess. A test file's own require
// path is relative to ITS OWN directory, not the repo root.
function testFileRequiresScript(testFileRelPath, scriptAbsPath) {
  const testFileAbsPath = path.join(ROOT, testFileRelPath);
  const src = fs.readFileSync(testFileAbsPath, 'utf8');
  const requireRe = /require\(\s*['"](\.[^'"]+)['"]\s*\)/g;
  let m;
  while ((m = requireRe.exec(src))) {
    const resolved = path.resolve(path.dirname(testFileAbsPath), m[1]);
    const candidates = [resolved, `${resolved}.js`];
    if (candidates.includes(scriptAbsPath)) return true;
  }
  return false;
}

function findTestFilesCovering(scriptRelPath, allTestFiles = listAllTestFiles()) {
  const scriptAbsPath = path.join(ROOT, scriptRelPath);
  return allTestFiles.filter((testFile) => testFileRequiresScript(testFile, scriptAbsPath));
}

// Extracts every glob argument passed to `node --test` in root package.json's
// own "test" script — not hardcoded, so this stays correct if that command
// ever changes. Supports exactly the one glob shape this repo's package.json
// actually uses (a directory prefix plus a single `*` segment); see
// globToRegExp's own comment for why that's a deliberate, disclosed limit
// rather than a general-purpose glob engine.
function getTestCommandGlobs(pkg = readRootPackageJson()) {
  const testScript = (pkg.scripts && pkg.scripts.test) || '';
  const globs = [];
  const re = /node\s+--test\s+([^\n&|]+)/g;
  let m;
  while ((m = re.exec(testScript))) {
    globs.push(...m[1].trim().split(/\s+/).filter(Boolean));
  }
  return globs;
}

function readRootPackageJson() {
  return JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
}

function globToRegExp(glob) {
  const escaped = glob.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  const pattern = '^' + escaped.replace(/\*/g, '[^/]*') + '$';
  return new RegExp(pattern);
}

function isRunByTestCommand(testFileRelPath, globs) {
  return globs.some((g) => globToRegExp(g).test(testFileRelPath));
}

// Pure -- no filesystem reads beyond what's passed in. Decides one script's
// status given the test files that actually cover it and the globs the real
// `npm test` command runs.
function evaluateScript({ workflowFile, scriptPath }, coveringTestFiles, testCommandGlobs) {
  if (coveringTestFiles.length === 0) {
    return { status: 'uncovered', workflowFile, scriptPath };
  }
  const anyRun = coveringTestFiles.some((f) => isRunByTestCommand(f, testCommandGlobs));
  if (!anyRun) {
    return { status: 'orphaned', workflowFile, scriptPath, testFiles: coveringTestFiles };
  }
  return { status: 'covered', workflowFile, scriptPath, testFiles: coveringTestFiles };
}

function runCoverageGaps({
  workflowsDir = WORKFLOWS_DIR,
  allTestFiles = listAllTestFiles(),
  testCommandGlobs = getTestCommandGlobs(),
} = {}) {
  const scheduledScripts = findScheduledScripts(workflowsDir);
  const results = scheduledScripts.map((s) => {
    const covering = findTestFilesCovering(s.scriptPath, allTestFiles);
    return evaluateScript(s, covering, testCommandGlobs);
  });
  const hasFindings = results.some((r) => r.status !== 'covered');
  return { results, hasFindings };
}

function renderReport({ results, hasFindings }) {
  const lines = ['coverage-gaps -- scheduled-job test coverage', ''];
  for (const r of results) {
    if (r.status === 'covered') {
      lines.push(`✓ ${r.scriptPath} (${r.workflowFile}) — covered by ${r.testFiles.join(', ')}`);
    } else if (r.status === 'orphaned') {
      lines.push(
        `✗ ${r.scriptPath} (${r.workflowFile}) — has a real test (${r.testFiles.join(', ')}) ` +
          `but it is never run by \`npm test\` -- move or add it to what that command actually globs`
      );
    } else {
      lines.push(`✗ ${r.scriptPath} (${r.workflowFile}) — no test anywhere in the repo requires this file`);
    }
  }
  lines.push('');
  lines.push(hasFindings ? 'One or more scheduled scripts have a coverage gap -- see above.' : 'Every scheduled script has real, CI-reachable test coverage.');
  return lines.join('\n');
}

if (require.main === module) {
  const asJson = process.argv.includes('--json');
  const result = runCoverageGaps();
  if (asJson) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(renderReport(result));
  }
  process.exitCode = result.hasFindings ? 1 : 0;
}

module.exports = {
  listWorkflowFiles,
  hasScheduleTrigger,
  extractNodeScriptInvocations,
  findScheduledScripts,
  listAllTestFiles,
  testFileRequiresScript,
  findTestFilesCovering,
  getTestCommandGlobs,
  globToRegExp,
  isRunByTestCommand,
  evaluateScript,
  runCoverageGaps,
  renderReport,
};

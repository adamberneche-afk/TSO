'use strict';
// Regression tests for tools/coverage-gaps/check.js — everything here is
// synthetic (temp dirs, injected test-file/glob lists), never the real repo,
// so a legitimate future gap doesn't make this suite fail. Same convention
// as tests/watchdog.test.js/tests/deploy-drift.test.js: node:test,
// node:assert/strict, real temp fixtures over mocks where a real filesystem
// makes the test more honest than a fake would.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const {
  listWorkflowFiles,
  hasScheduleTrigger,
  extractNodeScriptInvocations,
  findScheduledScripts,
  testFileRequiresScript,
  findTestFilesCovering,
  getTestCommandGlobs,
  globToRegExp,
  isRunByTestCommand,
  evaluateScript,
  renderReport
} = require('../tools/coverage-gaps/check.js');

const SCHEDULED = "name: X\non:\n  schedule:\n    - cron: '0 7 * * *'\njobs:\n  a:\n    steps:\n      - run: node scripts/thing.js\n";
const NOT_SCHEDULED = "name: X\non:\n  push:\njobs:\n  a:\n    steps:\n      - run: node scripts/thing.js\n";
const HEREDOC_ONLY = "name: X\non:\n  schedule:\n    - cron: '0 7 * * *'\njobs:\n  a:\n    steps:\n      - run: |\n          node - << 'EOF'\n          console.log(1)\n          EOF\n";

function makeWorkflowsDir(files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tso-coverage-gaps-test-'));
  for (const [name, content] of Object.entries(files)) fs.writeFileSync(path.join(dir, name), content);
  return dir;
}

function makeTmpFile(content) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tso-coverage-gaps-fixture-'));
  const file = path.join(dir, 'x.test.js');
  fs.writeFileSync(file, content);
  return { dir, file };
}

// ---------------------------------------------------------------------------
// findScheduledScripts / extractNodeScriptInvocations / hasScheduleTrigger
// ---------------------------------------------------------------------------

test('hasScheduleTrigger distinguishes a real schedule: block from unrelated text', () => {
  assert.equal(hasScheduleTrigger(SCHEDULED), true);
  assert.equal(hasScheduleTrigger(NOT_SCHEDULED), false);
  assert.equal(hasScheduleTrigger('# schedule a follow-up\non:\n  push:\n'), false);
});

test('extractNodeScriptInvocations finds a bare relative script path, not just an explicitly-relative one', () => {
  assert.deepEqual(extractNodeScriptInvocations('run: node scripts/thing.js'), ['scripts/thing.js']);
  assert.deepEqual(extractNodeScriptInvocations('run: node ./tools/watchdog/check.js'), ['./tools/watchdog/check.js']);
});

test('extractNodeScriptInvocations finds nothing for a heredoc/inline invocation with no real file path', () => {
  assert.deepEqual(extractNodeScriptInvocations("node - << 'EOF'\nconsole.log(1)\nEOF"), []);
});

test('extractNodeScriptInvocations deduplicates repeated mentions of the same script', () => {
  assert.deepEqual(extractNodeScriptInvocations('node a/b.js\n...\nnode a/b.js'), ['a/b.js']);
});

test('findScheduledScripts only reports scripts from workflows with a real schedule trigger', () => {
  const dir = makeWorkflowsDir({ 'scheduled.yml': SCHEDULED, 'push-only.yml': NOT_SCHEDULED });
  const found = findScheduledScripts(dir);
  assert.deepEqual(found, [{ workflowFile: 'scheduled.yml', scriptPath: 'scripts/thing.js' }]);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('findScheduledScripts finds nothing for a schedule-triggered workflow whose only node invocation is a heredoc', () => {
  const dir = makeWorkflowsDir({ 'heredoc.yml': HEREDOC_ONLY });
  assert.deepEqual(findScheduledScripts(dir), []);
  fs.rmSync(dir, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
// testFileRequiresScript / findTestFilesCovering
// ---------------------------------------------------------------------------

test('testFileRequiresScript resolves a relative require against the TEST FILE\'s own directory, not the repo root', () => {
  const { dir, file } = makeTmpFile("require('../target.js');\n");
  const targetAbsPath = path.resolve(dir, '..', 'target.js');
  assert.equal(testFileRequiresScript(path.relative(path.join(__dirname, '..'), file), targetAbsPath), true);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('testFileRequiresScript matches whether or not the require call includes the .js extension', () => {
  const { dir, file } = makeTmpFile("require('../target');\n");
  const targetAbsPath = path.resolve(dir, '..', 'target.js');
  assert.equal(testFileRequiresScript(path.relative(path.join(__dirname, '..'), file), targetAbsPath), true);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('testFileRequiresScript is false for a test file that requires something else entirely', () => {
  const { dir, file } = makeTmpFile("require('../unrelated.js');\n");
  const targetAbsPath = path.resolve(dir, '..', 'target.js');
  assert.equal(testFileRequiresScript(path.relative(path.join(__dirname, '..'), file), targetAbsPath), false);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('findTestFilesCovering returns only the matching test file(s) out of a real candidate list, not every candidate', () => {
  const { dir, file: matching } = makeTmpFile("require('../target.js');\n");
  const targetAbsPath = path.resolve(dir, '..', 'target.js');
  const unrelated = path.join(dir, 'unrelated.test.js');
  fs.writeFileSync(unrelated, "require('../something-else.js');\n");

  const scriptRelPath = path.relative(path.join(__dirname, '..'), targetAbsPath);
  const matchingRel = path.relative(path.join(__dirname, '..'), matching);
  const unrelatedRel = path.relative(path.join(__dirname, '..'), unrelated);

  const covering = findTestFilesCovering(scriptRelPath, [matchingRel, unrelatedRel]);
  assert.deepEqual(covering, [matchingRel]);
  fs.rmSync(dir, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
// getTestCommandGlobs / globToRegExp / isRunByTestCommand
// ---------------------------------------------------------------------------

test('getTestCommandGlobs extracts the real glob(s) from a package.json "test" script, not a hardcoded assumption', () => {
  const pkg = { scripts: { test: 'node --test tests/*.test.js && tsx tests/e2e-hybrid-config.ts' } };
  assert.deepEqual(getTestCommandGlobs(pkg), ['tests/*.test.js']);
});

test('getTestCommandGlobs handles multiple glob arguments to one `node --test` invocation', () => {
  const pkg = { scripts: { test: 'node --test tests/*.test.js scripts/__tests__/*.test.js' } };
  assert.deepEqual(getTestCommandGlobs(pkg), ['tests/*.test.js', 'scripts/__tests__/*.test.js']);
});

test('globToRegExp: a single * segment matches within one path component, not across a slash', () => {
  const re = globToRegExp('tests/*.test.js');
  assert.equal(re.test('tests/watchdog.test.js'), true);
  assert.equal(re.test('scripts/__tests__/health-analyzer.test.js'), false);
});

test('isRunByTestCommand: true only for a path one of the real globs actually matches', () => {
  const globs = ['tests/*.test.js'];
  assert.equal(isRunByTestCommand('tests/watchdog.test.js', globs), true);
  assert.equal(isRunByTestCommand('scripts/__tests__/health-analyzer.test.js', globs), false);
});

// ---------------------------------------------------------------------------
// evaluateScript — the actual coverage/orphaned/uncovered decision
// ---------------------------------------------------------------------------

test('evaluateScript: covered when a test requires the script AND that test file is run by npm test', () => {
  const result = evaluateScript(
    { workflowFile: 'x.yml', scriptPath: 'tools/x/check.js' },
    ['tests/x.test.js'],
    ['tests/*.test.js']
  );
  assert.equal(result.status, 'covered');
});

test('evaluateScript: orphaned when a real test exists but sits outside every glob npm test actually runs', () => {
  const result = evaluateScript(
    { workflowFile: 'health-report.yml', scriptPath: 'scripts/health-analyzer.js' },
    ['scripts/__tests__/health-analyzer.test.js'],
    ['tests/*.test.js']
  );
  assert.equal(result.status, 'orphaned');
});

test('evaluateScript: uncovered when no test anywhere requires the script at all', () => {
  const result = evaluateScript({ workflowFile: 'x.yml', scriptPath: 'tools/x/check.js' }, [], ['tests/*.test.js']);
  assert.equal(result.status, 'uncovered');
});

test('evaluateScript: covered if AT LEAST ONE of several covering test files is actually run, even if another is orphaned', () => {
  const result = evaluateScript(
    { workflowFile: 'x.yml', scriptPath: 'tools/x/check.js' },
    ['scripts/__tests__/x.test.js', 'tests/x.test.js'],
    ['tests/*.test.js']
  );
  assert.equal(result.status, 'covered');
});

// ---------------------------------------------------------------------------
// renderReport
// ---------------------------------------------------------------------------

test('renderReport explains an orphaned finding as "has a real test but it never runs", not as missing coverage', () => {
  const body = renderReport({
    hasFindings: true,
    results: [
      {
        status: 'orphaned',
        workflowFile: 'health-report.yml',
        scriptPath: 'scripts/health-analyzer.js',
        testFiles: ['scripts/__tests__/health-analyzer.test.js']
      }
    ]
  });
  assert.ok(body.includes('has a real test'));
  assert.ok(body.includes('never run by'));
});

test('renderReport reports overall success only when nothing has a finding', () => {
  const body = renderReport({
    hasFindings: false,
    results: [{ status: 'covered', workflowFile: 'x.yml', scriptPath: 'a.js', testFiles: ['tests/a.test.js'] }]
  });
  assert.ok(body.includes('CI-reachable test coverage'));
});

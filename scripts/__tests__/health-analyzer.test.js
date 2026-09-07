// Regression tests for health-analyzer.js's inverted/mislabeled
// heuristics.
//
// 1. assessCodeHealth()'s `testing` status used to be inverted: more
//    issues whose body mentions "test"/"jest" was treated as
//    "HEALTHY" ("more test issues = better coverage", per the old
//    comment) -- backwards, since an issue mentioning tests is far
//    more likely a bug report about a broken/missing test than proof
//    one exists. It should carry the same polarity as typescript/eslint:
//    more matching issues means NEEDS_ATTENTION, not HEALTHY.
// 2. analyzeNorthStar()'s `extensibility` field used to be a raw issue
//    count, but formatReport()'s markdown template rendered it with a
//    literal "%" suffix as if it were a percentage -- it could print
//    values far outside 0-100. It's now computed as an actual
//    percentage, like safety/ownership are.
// 3. analyzeNorthStar()'s safetyIssues filter nested its body-keyword
//    check inside labels.some(...) -- since .some() on an empty array
//    is always false, an issue with zero labels could never count as
//    a safety issue no matter what its body said. Discovered while
//    writing the extensibility test above (a labeled-but-not-really
//    fixture kept coming out as 0 safety issues). Fixed to (body
//    check) OR (label check), matching ownershipIssues' structure.

const test = require('node:test');
const assert = require('node:assert/strict');
const { assessCodeHealth, analyzeNorthStar, formatReport } = require('../health-analyzer');

function fakeIssue({ body = '', labels = [], state = 'open' } = {}) {
  return { title: 'fake issue', body, labels: labels.map(name => ({ name })), state };
}

test('assessCodeHealth: testing status is NEEDS_ATTENTION when issues mention tests, not HEALTHY', () => {
  const issues = [
    fakeIssue({ body: 'The jest test for auth.ts is flaky and fails intermittently.' }),
    fakeIssue({ body: 'Unrelated issue about the UI.' }),
  ];

  const health = assessCodeHealth(issues);

  assert.equal(health.testing.issues, 1);
  assert.equal(health.testing.status, 'NEEDS_ATTENTION');
});

test('assessCodeHealth: testing status is HEALTHY when nothing mentions tests', () => {
  const issues = [fakeIssue({ body: 'Unrelated issue about the UI.' })];

  const health = assessCodeHealth(issues);

  assert.equal(health.testing.issues, 0);
  assert.equal(health.testing.status, 'HEALTHY');
});

test('assessCodeHealth: typescript/eslint keep their existing (non-inverted) polarity', () => {
  const issues = [
    fakeIssue({ body: 'tsconfig strict mode is causing noImplicitAny errors.' }),
    fakeIssue({ body: 'ESLint is failing on the new file.' }),
  ];

  const health = assessCodeHealth(issues);

  assert.equal(health.typescript.status, 'NEEDS_ATTENTION');
  assert.equal(health.eslint.status, 'NEEDS_ATTENTION');
});

test('analyzeNorthStar: a safety issue with no labels is still counted, from body text alone', () => {
  const issues = [
    fakeIssue({ body: 'This is a classic XSS injection vulnerability.', labels: [] }),
    fakeIssue({ body: 'Just a normal feature request.', labels: [] }),
  ];

  const result = analyzeNorthStar(issues);

  assert.equal(result.safety.count, 1);
});

test('analyzeNorthStar: extensibility is a real percentage (0-100), not a raw count', () => {
  const issues = [
    fakeIssue({ body: 'This is a security vulnerability and injection risk.' }), // safety
    fakeIssue({ body: 'This involves the wallet and private key.' }), // ownership
    fakeIssue({ body: 'Just a normal feature request.' }),
    fakeIssue({ body: 'Another normal feature request.' }),
  ];

  const result = analyzeNorthStar(issues);

  // 2 of 4 issues are safety/ownership, so extensibility should be the
  // remaining 2/4 = 50%, not the raw count (2).
  assert.equal(result.extensibility, 50);
  assert.ok(result.extensibility >= 0 && result.extensibility <= 100);
});

test('formatReport: the CODE HEALTH section is honestly framed as issue-tracker signals, and testing no longer claims "more = better coverage"', () => {
  const issues = [fakeIssue({ body: 'a jest test is broken' })];
  const report = {
    timestamp: new Date().toISOString(),
    summary: { total: 1, open: 1, closed: 0 },
    northStarAlignment: analyzeNorthStar(issues),
    frictionPoints: [],
    codeHealth: assessCodeHealth(issues),
    priorityMatrix: { highImpact: 0, lowEffort: 0, quickWins: 0, topQuickWin: 'None' },
    recommendedActions: [],
  };

  const markdown = formatReport(report);

  assert.match(markdown, /not a real code-health scan/i);
  assert.doesNotMatch(markdown, /more = better coverage/i);
  // The bug this test guards: with one issue mentioning "jest", the
  // rendered testing status must say NEEDS_ATTENTION, not HEALTHY.
  assert.match(markdown, /\*\*Testing\*\*: NEEDS_ATTENTION/);
});

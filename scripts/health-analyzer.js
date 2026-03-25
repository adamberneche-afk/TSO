#!/usr/bin/env node
const { Octokit } = require("@octokit/rest");
const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

async function analyzeIssues() {
  // Fetch ALL issues (open/closed) - GitHub API handles pagination
  const { data: issues } = await octokit.issues.listForRepo({
    owner: "amberneche-afk",
    repo: "TSO",
    state: "all",
    per_page: 100
  });

  // Apply your north star/lessons.md rules
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      total: issues.length,
      open: issues.filter(i => i.state === "open").length,
      closed: issues.filter(i => i.state === "closed").length
    },
    northStarAlignment: analyzeNorthStar(issues),
    frictionPoints: identifyFriction(issues),
    codeHealth: assessCodeHealth(issues),
    priorityMatrix: buildPriorityMatrix(issues),
    recommendedActions: generateActions(issues)
  };

  // Format as markdown for easy reading
  return formatReport(report);
}

function analyzeNorthStar(issues) {
  // Check alignment with your stated principles: safety, user ownership, extensibility
  const safetyIssues = issues.filter(i => 
    i.labels.some(l => l.name.toLowerCase().includes("security") || 
                      l.name.toLowerCase().includes("vulnerability") ||
                  (i.body && (i.body.includes("unsafe") ||
                           i.body.includes("XSS") ||
                           i.body.includes("injection") ||
                           i.body.includes("privacy breach"))))
  );
  
  const ownershipIssues = issues.filter(i => 
    (i.body && (i.body.includes("wallet") || 
                i.body.includes("private key") ||
                i.body.includes("data ownership") ||
                i.body.includes("seed phrase"))) ||
    i.labels.some(l => l.name.toLowerCase().includes("privacy"))
  );
  
  return {
    safety: { 
      count: safetyIssues.length,
      percentage: Math.round((safetyIssues.length / issues.length) * 100),
      topIssue: safetyIssues[0]?.title || "None"
    },
    ownership: { 
      count: ownershipIssues.length,
      percentage: Math.round((ownershipIssues.length / issues.length) * 100),
      topIssue: ownershipIssues[0]?.title || "None"
    },
    extensibility: issues.length - (safetyIssues.length + ownershipIssues.length) // Simplified
  };
}

function identifyFriction(issues) {
  // Based on your lessons.md: unsafe property access, race conditions, etc.
  const patterns = {
    unsafeAccess: issues.filter(i => 
      i.body && (i.body.includes(".length") || 
                i.body.includes(".trim()") ||
                i.body.includes("window.ethereum") ||
                i.body.includes("localStorage") ||
                i.body.includes("JSON.parse") ||
                i.body.includes("JSON.stringify") ||
                i.body.includes(".value") ||
                i.body.includes(".innerHTML"))
    ),
    raceConditions: issues.filter(i => 
      i.body && (i.body.includes("MetaMask") || 
                i.body.includes("wallet") ||
                i.body.includes("disconnect") ||
                i.body.includes("race") ||
                i.body.includes("check availability") ||
                i.body.includes("before using"))
    ),
    missingErrorHandling: issues.filter(i => 
      i.body && (i.body.includes("async") || i.body.includes("Promise")) &&
      !(i.body.includes("try/catch") || i.body.includes(".catch")) &&
      !(i.body.includes("await") && i.body.includes("try"))
    ),
    prismaIssues: issues.filter(i => 
      i.body && (i.body.includes("Prisma") || 
                i.body.includes("prisma") ||
                i.body.includes("connect") ||
                i.body.includes("create") ||
                i.body.includes("findUnique") ||
                i.body.includes("update") ||
                i.body.includes("delete"))
    )
  };

  return Object.entries(patterns).map(([type, arr]) => ({
    type,
    count: arr.length,
    percentage: Math.round((arr.length / issues.length) * 100),
    sample: arr[0]?.title || "None"
  }));
}

function assessCodeHealth(issues) {
  // Based on your lessons.md preventive measures
  const tsConfigIssues = issues.filter(i => 
    i.body && (i.body.includes("tsconfig") ||
              i.body.includes("strict") ||
              i.body.includes("noImplicitAny") ||
              i.body.includes("exactOptionalPropertyTypes"))
  );
  
  const eslintIssues = issues.filter(i => 
    i.body && (i.body.includes("ESLint") ||
              i.body.includes("eslint") ||
              i.body.includes("lint") ||
              i.body.includes("@typescript-eslint"))
  );
  
  const testIssues = issues.filter(i => 
    i.body && (i.body.includes("test") ||
              i.body.includes("jest") ||
              i.body.includes("unit test") ||
              i.body.includes("@test"))
  );
  
  return {
    typescript: { 
      issues: tsConfigIssues.length,
      status: tsConfigIssues.length > 0 ? "NEEDS_ATTENTION" : "HEALTHY"
    },
    eslint: { 
      issues: eslintIssues.length,
      status: eslintIssues.length > 0 ? "NEEDS_ATTENTION" : "HEALTHY"
    },
    testing: { 
      issues: testIssues.length,
      status: testIssues.length > 0 ? "HEALTHY" : "NEEDS_ATTENTION" // Inverse: more test issues = better coverage
    }
  };
}

function buildPriorityMatrix(issues) {
  // Impact = how many users/features affected (labels: breaking, blocking, critical)
  // Effort = estimated from labels/comments (simple heuristic)
  const highImpact = issues.filter(i => 
    i.labels.some(l => ["breaking", "blocking", "critical", "high", "severe"].includes(l.name.toLowerCase())) ||
    (i.body && (i.body.includes("block") ||
                i.body.includes("critical") ||
                i.body.includes("severe") ||
                i.body.includes("major")))
  );
  
  const lowEffort = issues.filter(i => 
    i.labels.some(l => ["trivial", "easy", "quick fix", "low effort", "minor"].includes(l.name.toLowerCase())) ||
    (i.body && (i.body.includes("easy") ||
                i.body.includes("trivial") ||
                i.body.includes("quick") ||
                i.body.includes("minor")))
  );
  
  // Quick win quadrant: high impact + low effort
  const quickWins = highImpact.filter(i => lowEffort.includes(i));
  
  return {
    highImpact: highImpact.length,
    lowEffort: lowEffort.length,
    quickWins: quickWins.length,
    topQuickWin: quickWins[0]?.title || "None"
  };
}

function generateActions(issues) {
  // Produce 1-3 concrete next steps based on analysis
  const actions = [];
  
  // 1. If unsafe access > 20%, prioritize fixing
  const unsafePct = identifyFriction(issues).find(f => f.type === "unsafeAccess")?.percentage || 0;
  if (unsafePct > 20) {
    actions.push(`🔴 **PRIORITY**: Fix unsafe property access (${unsafePct}% of issues). 
      Add try/catch around all JSON.parse/localStorage/window.ethereum accesses. 
      Use helpers from lessons.md: safeGet() and withMetaMask()`);
  }
  
  // 2. If Prisma issues > 15%, add pre-commit hook
  const prismaPct = identifyFriction(issues).find(f => f.type === "prismaIssues")?.percentage || 0;
  if (prismaPct > 15) {
    actions.push(`🟡 **HIGH**: Add prisma generate to pre-commit hook (${prismaPct}% of issues). 
      In package.json: 
      "prepare": "husky install",
      "husky": {
        "hooks": {
          "pre-commit": "prisma generate && tsc --noEmit"
        }
      }`);
  }
  
  // 3. If testing < 30% coverage implied, suggest test spikes
  const testStatus = assessCodeHealth(issues).testing.status;
  if (testStatus === "NEEDS_ATTENTION") {
    actions.push(`🟢 **MEDIUM**: Increase test coverage. 
      Start with services handling external deps: 
      - auth.ts (wallet/MetaMask) 
      - ragApi.ts (external API) 
      - InterviewAgent.ts (LLM)`);
  }
  
  // 4. Always suggest quick wins if exist
  const pMatrix = buildPriorityMatrix(issues);
  if (pMatrix.quickWins > 0) {
    actions.push(`⚡ **QUICK WIN**: Address ${pMatrix.quickWins} high-impact/low-effort issues first. 
      Top candidate: "${pMatrix.topQuickWin}"`);
  }
  
  return actions.slice(0, 3); // Max 3 actions
}

function formatReport(report) {
  return `
# 📊 TSO REPOSITORY HEALTH REPORT
*Generated at ${new Date(report.timestamp).toLocaleString()}*

## 📈 SUMMARY
- **Total Issues**: ${report.summary.total} (${report.summary.open} open, ${report.summary.closed} closed)

## 🧭 NORTH STAR ALIGNMENT
| Principle       | % of Issues | Top Issue Example                     |
|-----------------|-------------|---------------------------------------|
| **Safety**      | ${report.northStarAlignment.safety.percentage}% | ${report.northStarAlignment.safety.topIssue} |
| **Ownership**   | ${report.northStarAlignment.ownership.percentage}% | ${report.northStarAlignment.ownership.topIssue} |
| **Extensibility**| ${report.northStarAlignment.extensibility}% | *(Implied: remaining issues)* |

## ⚠️ FRICTION POINTS (from lessons.md)
${report.frictionPoints.map(p => 
  `- **${p.type}**: ${p.count} issues (${p.percentage}%) 
    *Example: "${p.sample}"`
).join('\n')}

## 💊 CODE HEALTH
- **TypeScript**: ${report.codeHealth.typescript.status} 
  (${report.codeHealth.typescript.issues} tsconfig-related issues)
- **ESLint**: ${report.codeHealth.eslint.status} 
  (${report.codeHealth.eslint.issues} linting issues)
- **Testing**: ${report.codeHealth.testing.status} 
  (${report.codeHealth.testing.issues} test-related issues → *more = better coverage*)

## 🎯 PRIORITY MATRIX
- **High Impact Issues**: ${report.priorityMatrix.highImpact}
- **Low Effort Issues**: ${report.priorityMatrix.lowEffort}
- **⚡ QUICK WINS** (High Impact + Low Effort): ${report.priorityMatrix.quickWins}
  *Top candidate: "${report.priorityMatrix.topQuickWin}"*

## 🚀 RECOMMENDED ACTIONS
${report.recommendedActions.map((a, i) => 
  `${i+1}. ${a}`
).join('\n')}

---
*This report is automated. To regenerate manually:*
*gh workflow run health-report.yml*
*To adjust criteria: edit scripts/health-analyzer.js*
*Data source: GitHub API (no external tokens needed)*
`.trim();
}

// Run if called directly
if (require.main === module) {
  analyzeIssues().then(console.log).catch(console.error);
}

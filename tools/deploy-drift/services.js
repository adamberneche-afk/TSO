// =============================================================================
// deploy-drift/services — the two things this repo actually deploys, and
// where each self-reports its own live commit SHA. Add a new deployable
// here (versionUrl + gitPaths) and both check.js and expected-marker.js
// pick it up automatically; nothing else needs to change.
//
// `gitPaths` scopes `git log` the same way KOS's project-map.json scopes
// each Apps Script project's marker -- so a commit that only touches
// packages/registry never makes tais-frontend look drifted, and vice versa.
// =============================================================================

const SERVICES = {
  'tais-registry': {
    label: 'Registry (Render)',
    versionUrl: 'https://tso.onrender.com/api/version',
    gitPaths: ['packages/registry'],
  },
  'tais-frontend': {
    // Cut over 2026-09-19: the tais-frontend Render Static Site was
    // created for real (via the Render MCP connector) and its first
    // build confirmed live end-to-end -- write-version.cjs's prebuild
    // step reported source: "render" with the deploying commit's SHA,
    // and the build log shows "Your site is live". This service's URL
    // is what render.yaml's own tais-frontend block already assumed.
    label: 'Frontend (Render)',
    versionUrl: 'https://tais-frontend.onrender.com/version.json',
    gitPaths: ['tais_frontend'],
  },
};

function knownServiceNames() {
  return Object.keys(SERVICES);
}

module.exports = { SERVICES, knownServiceNames };

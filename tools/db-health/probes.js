// =============================================================================
// db-health/probes — what this tool checks, and what each check actually
// proves. Two live HTTP probes plus a record of every Render-managed
// database this repo depends on and when it expires.
//
// Both probes hit endpoints the registry ALREADY exposed, unauthenticated,
// for the whole 2026-03-24 -> 2026-09-20 outage. Nothing new had to be
// built on the server to make this checkable -- see this directory's
// README.md for why that matters.
// =============================================================================

const REGISTRY_ORIGIN = 'https://tso.onrender.com';

const PROBES = {
  connectivity: {
    label: 'Database connectivity',
    url: `${REGISTRY_ORIGIN}/health`,
    // routes/health.ts runs a literal `SELECT 1` through the Skills Prisma
    // client and answers 200 {services:{database:'connected'}} or 503
    // {status:'unhealthy', error:'Database connection failed'}. That 503 is
    // the precise signature the live service would have returned on every
    // request for ~6 months, had anything been asking.
    proves: 'the registry can open a connection and run a trivial query',
  },
  schema: {
    label: 'Schema queryable',
    url: `${REGISTRY_ORIGIN}/api/v1/skills?limit=1`,
    // A public, unauthenticated list route (skills.ts documents it as
    // "List all skills (public)"; auth middleware only applies to POST).
    // Connectivity alone is not enough: a freshly created database with no
    // migrations applied answers `SELECT 1` happily while every real query
    // fails. This probe runs a real query against real tables.
    proves: 'real tables exist and can be queried, not just that a connection opens',
  },
};

// Render-managed databases this repo depends on, and the two dates that
// matter for each one.
//
// THE LIFECYCLE, because getting this wrong makes the tool lie (corrected
// 2026-09-20 against Render's own docs, having first shipped with the
// simpler and wrong model that expiry == deletion):
//
//   created ---30 days---> EXPIRES ---14 days grace---> DELETED FOREVER
//
// Expiry is NOT deletion. A Render free Postgres expires 30 days after
// creation, and Render then holds it for a 14-day grace period during
// which upgrading to a paid compute plan restores it with all data
// intact. Only after that grace period is the instance -- and everything
// in it -- permanently deleted.
//
// That distinction is the whole point of tracking both dates. "Expired,
// recoverable with a credit card for the next N days" and "deleted, the
// data is gone" demand completely different reactions, and a tool that
// reports them identically sends whoever reads it in the wrong direction
// at the worst possible moment. It also probably explains the original
// incident's two different Prisma errors: `P1017` on one database
// (expired/suspended, still present) and `P1001` on the other (past
// grace, actually gone).
//
// Free instances get NO backups of any kind -- no snapshots, no
// point-in-time recovery, no fork. Paid plans get continuous backups with
// PITR. So on this plan the grace period is the ONLY recovery mechanism
// that exists, which is exactly why it is tracked rather than assumed.
//
// Both dates are committed facts, not something this tool discovers: no
// tool available to this repo's CI can read a Render database's expiry,
// and adding a RENDER_API_KEY secret purely to fetch it would add exactly
// the kind of quietly-rotting credential tools/doctor/check.js exists to
// catch. So they are recorded here by hand, and check.js deliberately
// reports a passed-but-still-reachable date as a finding against THIS
// FILE rather than against the database -- a stale record here makes
// every warning below worthless, so it has to be loud.
const MANAGED_DATABASES = {
  'tais-rag': {
    label: 'Registry Postgres (RAG + Skills, consolidated)',
    id: 'dpg-danrvdrtqb8s73cupd5g-a',
    dashboardUrl: 'https://dashboard.render.com/d/dpg-danrvdrtqb8s73cupd5g-a',
    plan: 'free',
    // Created 2026-09-20T11:12:55Z; the Render API reported createdAt and
    // expiresAt identical to the microsecond, exactly 30 days apart. The
    // expiry is therefore a pure function of creation time -- no
    // redeploy, query, connection or other activity moves it, so no
    // "keep it warm" job can help.
    expiresAt: '2026-10-20T11:12:55Z',
    // Render's documented grace period between expiry and permanent
    // deletion. Upgrading to a paid plan within this window recovers the
    // database intact. If this is ever 0 or absent, check.js treats
    // expiry as immediate deletion -- the pessimistic reading.
    graceDays: 14,
    warnWithinDays: 10,
  },
};

function probeNames() {
  return Object.keys(PROBES);
}

function managedDatabaseNames() {
  return Object.keys(MANAGED_DATABASES);
}

module.exports = { PROBES, MANAGED_DATABASES, REGISTRY_ORIGIN, probeNames, managedDatabaseNames };

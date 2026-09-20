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

// Render-managed databases this repo depends on, and when each one dies on
// its own. `expiresAt` is a committed fact, not something this tool can
// discover: no tool available to this repo's CI can read a Render
// database's expiry, and adding a RENDER_API_KEY secret purely to fetch it
// would add exactly the kind of quietly-rotting credential
// tools/doctor/check.js exists to catch. So it is recorded here by hand,
// and check.js deliberately reports a passed-but-still-reachable date as a
// finding against THIS FILE rather than against the database -- a stale
// record here makes every warning below worthless, so it has to be loud.
const MANAGED_DATABASES = {
  'tais-rag': {
    label: 'Registry Postgres (RAG + Skills, consolidated)',
    id: 'dpg-danrvdrtqb8s73cupd5g-a',
    dashboardUrl: 'https://dashboard.render.com/d/dpg-danrvdrtqb8s73cupd5g-a',
    plan: 'free',
    // Render's free Postgres plan deletes the instance 30 days after
    // creation. This is the actual root cause of the 2026-03/2026-09
    // outage -- not a random suspension, a scheduled deletion nobody was
    // watching for. Created 2026-09-20T11:12:55Z.
    expiresAt: '2026-10-20T11:12:55Z',
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

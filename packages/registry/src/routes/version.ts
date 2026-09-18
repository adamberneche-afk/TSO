import { Router, Request, Response } from 'express';

/**
 * Deploy-drift version marker — ported from the same self-reporting
 * pattern already proven in this account's KOS, Argoloth, and Mothership
 * repos (see tools/deploy-drift/README.md at the repo root for the full
 * mechanism and why this exists).
 *
 * Unlike those Apps Script projects, this service has no Google
 * sign-in wall in front of it and unrestricted outbound/inbound HTTP —
 * so instead of the deployed code pushing its version out via a GitHub
 * `repository_dispatch` (necessary there because most of their web apps
 * can't be polled from outside Google's auth), this just answers a plain
 * GET. tools/deploy-drift/check.js polls this directly; no GitHub token
 * of any kind needs to exist on this service for that to work.
 *
 * The SHA comes from whatever the hosting platform stamps at deploy time
 * — never hand-set, never baked into a committed file:
 *   - Render sets RENDER_GIT_COMMIT automatically on every deploy
 *     (https://render.com/docs/environment-variables#all-services), no
 *     config needed.
 *   - DEPLOY_VERSION_SHA is a manual fallback for a platform that doesn't
 *     provide its own equivalent (e.g. the Railway path documented in
 *     DEPLOYMENT.md as an alternative to the real Render deployment).
 * If neither is set (a local `npm run dev`, for instance), `sha` is
 * `null` and `source` says so — deliberately not a fake placeholder value,
 * since a wrong-but-present SHA is worse than an honest gap for a tool
 * whose entire job is catching exactly that kind of mismatch.
 */

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  const renderSha = process.env.RENDER_GIT_COMMIT;
  const manualSha = process.env.DEPLOY_VERSION_SHA;
  const sha = renderSha || manualSha || null;
  const source = renderSha ? 'render' : manualSha ? 'manual' : 'unknown';

  res.json({
    sha,
    source,
    checkedAt: new Date().toISOString(),
  });
});

export { router as versionRoutes };

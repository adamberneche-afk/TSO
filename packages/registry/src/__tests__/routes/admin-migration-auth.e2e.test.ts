// Regression test for the admin migration-repair endpoint that 401'd
// unconditionally for everyone -- including real admins with valid
// credentials.
//
// '/admin/migration/fix-migration' (mounted directly on the bare Express
// `app`, entirely outside apiV1Router) was `app.use('/admin/migration',
// adminMiddleware, migrationFixRoutes)`. adminMiddleware (requireAdmin)
// only *checks* req.user.walletAddress against the admin wallet list --
// it never populates req.user itself, and nothing upstream of this
// mount ever ran authMiddleware (authenticateToken). req.user was
// therefore always undefined here, so adminMiddleware's own
// "!req.user || !req.user.walletAddress" branch fired on every single
// request, real admin JWT or not.
//
// '/api/v1/admin/migrate/personality' (mounted on apiV1Router) looks
// identical at a glance -- also just `adminMiddleware` with no
// authMiddleware in front of it -- but is included here as a *passing*
// control case, not a second instance of the bug: apiV1Router.use('/admin',
// authMiddleware, adminMiddleware, ..., adminRoutes) is registered
// earlier and matches any path starting with '/admin' (Express prefix
// matching), including '/admin/migrate/...'. adminRoutes has no route
// for '/migrate/personality', so it falls through via next() -- but not
// before that mount's authMiddleware+adminMiddleware already ran and
// populated/checked req.user. So this route was never actually
// reachable without going through a real auth check first; it just
// depended on registration order and prefix-matching to get there
// instead of declaring it explicitly. It's included below purely to
// document and lock in that it keeps behaving correctly.

import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../../index';

const ADMIN_WALLET = process.env.ADMIN_WALLET_ADDRESSES!.split(',')[0];
const NON_ADMIN_WALLET = '0x2222222222222222222222222222222222222222';

function authToken(walletAddress: string): string {
  const secret = process.env.JWT_SECRET!;
  return jwt.sign({ walletAddress: walletAddress.toLowerCase() }, secret, {
    expiresIn: '1h',
    issuer: 'tais-platform',
    audience: 'tais-api',
  });
}

describe.each([
  ['/api/v1/admin/migrate/personality', 'admin/migrate/personality'],
  ['/admin/migration/fix-migration', 'admin/migration/fix-migration'],
])('POST %s auth', (path, label) => {
  it(`${label}: rejects an unauthenticated request with 401, not because it isn't an admin`, async () => {
    const response = await request(app).post(path);
    expect(response.status).toBe(401);
  });

  it(`${label}: rejects an authenticated non-admin with 403`, async () => {
    const response = await request(app)
      .post(path)
      .set('Authorization', `Bearer ${authToken(NON_ADMIN_WALLET)}`);
    expect(response.status).toBe(403);
  });

  it(`${label}: lets a real, authenticated admin actually run it`, async () => {
    const response = await request(app)
      .post(path)
      .set('Authorization', `Bearer ${authToken(ADMIN_WALLET)}`);

    // The original bug meant this always came back 401 regardless of
    // who was asking. A real admin must get past auth entirely --
    // whatever the migration SQL itself does (success or a 500 from an
    // unrelated DB state) is not what this test is guarding.
    expect(response.status).not.toBe(401);
    expect(response.status).not.toBe(403);
  });
});

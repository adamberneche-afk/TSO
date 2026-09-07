// Regression test for the uncapped public search `limit` bug.
//
// GET /api/v1/search is public (no auth middleware) and only rate-limits
// request *rate*, not payload size. `limitNum` used to be
// `parseInt(limit as string) || 20` with no upper bound, so
// `?limit=999999999` passed straight through to Prisma's `take`, forcing
// an attempt to materialize (and join/count-aggregate) the entire
// matching `skill` table in one unauthenticated request.

import { Request, Response } from 'express';
import { searchRoutes } from '../../routes/search';

// Pull the actual GET '/' handler off the router so this test exercises
// the real route logic (including the clamp) without needing a live DB or
// hundreds of seeded rows to prove the cap.
function getSearchHandler() {
  const layer = (searchRoutes as any).stack.find((l: any) => l.route?.path === '/' && l.route.methods.get);
  return layer.route.stack[0].handle as (req: any, res: any, next: any) => Promise<void>;
}

function mockRes() {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res as Response;
}

describe('GET /search limit clamping', () => {
  it('clamps an attacker-supplied huge limit to 100', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const req = {
      query: { query: 'anything', limit: '999999999' },
      prisma: { skill: { findMany } },
      log: undefined,
    } as unknown as Request;

    await getSearchHandler()(req, mockRes(), jest.fn());

    expect(findMany).toHaveBeenCalledTimes(1);
    expect(findMany.mock.calls[0][0].take).toBe(100);
  });

  it('still honors a reasonable requested limit', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const req = {
      query: { query: 'anything', limit: '5' },
      prisma: { skill: { findMany } },
      log: undefined,
    } as unknown as Request;

    await getSearchHandler()(req, mockRes(), jest.fn());

    expect(findMany.mock.calls[0][0].take).toBe(5);
  });

  it('defaults to 20 when no limit is given', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const req = {
      query: { query: 'anything' },
      prisma: { skill: { findMany } },
      log: undefined,
    } as unknown as Request;

    await getSearchHandler()(req, mockRes(), jest.fn());

    expect(findMany.mock.calls[0][0].take).toBe(20);
  });
});

// Regression test for the fake DB health check.
//
// checkDatabaseHealth() used to be `return true` unconditionally --
// /monitoring/dashboard reported `overall: healthy` even with the
// database fully down, since nothing about the return value depended on
// an actual query ever succeeding.

import { checkDatabaseHealth } from '../../routes/monitoring';

describe('checkDatabaseHealth', () => {
  it('returns true when the database query succeeds', async () => {
    const fakePrisma = { $queryRaw: jest.fn().mockResolvedValue([{ '?column?': 1 }]) };
    await expect(checkDatabaseHealth(fakePrisma as any)).resolves.toBe(true);
  });

  it('returns false when the database is unreachable', async () => {
    const fakePrisma = { $queryRaw: jest.fn().mockRejectedValue(new Error("Can't reach database server")) };
    await expect(checkDatabaseHealth(fakePrisma as any)).resolves.toBe(false);
  });

  it('returns false rather than claiming health it cannot verify when no client is available', async () => {
    await expect(checkDatabaseHealth(undefined)).resolves.toBe(false);
  });
});

// Regression test for the guided-discovery session DELETE authz bypass.
//
// `if (wallet && session.walletAddress !== wallet.toLowerCase())` only ran
// the ownership check when a `wallet` was actually supplied -- omitting
// `wallet` from the request body (or sending an empty string) short-
// circuited the `&&` to false, skipping the check entirely and deleting
// any session regardless of who owned it. The sibling
// POST /session/:id/generate route requires `wallet` unconditionally and
// always compares; DELETE now follows the same pattern.

import request from 'supertest';
import app from '../../index';

const OWNER_WALLET = '0x1111111111111111111111111111111111111111';
const ATTACKER_WALLET = '0x2222222222222222222222222222222222222222';

describe('DELETE /guided-discovery/session/:id authorization', () => {
  async function startSession(wallet: string): Promise<string> {
    const response = await request(app)
      .post('/api/v1/guided-discovery/session/start')
      .send({ wallet })
      .expect(200);
    return response.body.sessionId;
  }

  it('rejects deletion with no wallet supplied at all (the bypass)', async () => {
    const sessionId = await startSession(OWNER_WALLET);

    await request(app)
      .delete(`/api/v1/guided-discovery/session/${sessionId}`)
      .send({})
      .expect(400);

    // Still there -- the omitted-wallet request must not have deleted it.
    await request(app)
      .get(`/api/v1/guided-discovery/session/${sessionId}`)
      .expect(200);
  });

  it('rejects deletion by a wallet that does not own the session', async () => {
    const sessionId = await startSession(OWNER_WALLET);

    await request(app)
      .delete(`/api/v1/guided-discovery/session/${sessionId}`)
      .send({ wallet: ATTACKER_WALLET })
      .expect(403);

    await request(app)
      .get(`/api/v1/guided-discovery/session/${sessionId}`)
      .expect(200);
  });

  it('allows the owning wallet to delete its own session', async () => {
    const sessionId = await startSession(OWNER_WALLET);

    await request(app)
      .delete(`/api/v1/guided-discovery/session/${sessionId}`)
      .send({ wallet: OWNER_WALLET })
      .expect(200);

    await request(app)
      .get(`/api/v1/guided-discovery/session/${sessionId}`)
      .expect(404);
  });
});

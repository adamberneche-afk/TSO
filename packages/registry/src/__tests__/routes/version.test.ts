import request from 'supertest';
import app from '../../index';

describe('Version Route', () => {
  const originalRenderSha = process.env.RENDER_GIT_COMMIT;
  const originalManualSha = process.env.DEPLOY_VERSION_SHA;

  afterEach(() => {
    if (originalRenderSha === undefined) delete process.env.RENDER_GIT_COMMIT;
    else process.env.RENDER_GIT_COMMIT = originalRenderSha;
    if (originalManualSha === undefined) delete process.env.DEPLOY_VERSION_SHA;
    else process.env.DEPLOY_VERSION_SHA = originalManualSha;
  });

  describe('GET /api/version', () => {
    it('reports the Render-provided SHA when RENDER_GIT_COMMIT is set', async () => {
      delete process.env.DEPLOY_VERSION_SHA;
      process.env.RENDER_GIT_COMMIT = 'a'.repeat(40);

      const response = await request(app).get('/api/version').expect(200);

      expect(response.body).toEqual({
        sha: 'a'.repeat(40),
        source: 'render',
        checkedAt: expect.any(String),
      });
    });

    it('falls back to DEPLOY_VERSION_SHA when RENDER_GIT_COMMIT is unset', async () => {
      delete process.env.RENDER_GIT_COMMIT;
      process.env.DEPLOY_VERSION_SHA = 'b'.repeat(40);

      const response = await request(app).get('/api/version').expect(200);

      expect(response.body.sha).toBe('b'.repeat(40));
      expect(response.body.source).toBe('manual');
    });

    it('prefers RENDER_GIT_COMMIT over DEPLOY_VERSION_SHA when both are set', async () => {
      process.env.RENDER_GIT_COMMIT = 'a'.repeat(40);
      process.env.DEPLOY_VERSION_SHA = 'b'.repeat(40);

      const response = await request(app).get('/api/version').expect(200);

      expect(response.body.sha).toBe('a'.repeat(40));
      expect(response.body.source).toBe('render');
    });

    it('reports a null sha and source "unknown" when neither is set', async () => {
      delete process.env.RENDER_GIT_COMMIT;
      delete process.env.DEPLOY_VERSION_SHA;

      const response = await request(app).get('/api/version').expect(200);

      expect(response.body.sha).toBeNull();
      expect(response.body.source).toBe('unknown');
    });

    it('requires no authentication', async () => {
      // No Authorization header, no X-API-Key -- this route must stay
      // publicly pollable the same way /health is, since
      // tools/deploy-drift/check.js polls it with no credential at all.
      await request(app).get('/api/version').expect(200);
    });
  });
});

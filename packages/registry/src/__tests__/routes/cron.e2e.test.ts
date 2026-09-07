// Regression tests for:
//
// 1. The production cron job hitting a 404 because render.yaml's
//    configured URL used the wrong route prefix (cron.ts's router is
//    mounted at '/admin/cron', not '/api/v1/cron').
// 2. P0.3/P0.5-P0.6: every /admin/cron/* handler used to fail OPEN, not
//    closed, when CRON_SECRET was unset -- `if (expectedToken &&
//    authHeader !== ...)` short-circuits to false when expectedToken is
//    falsy, silently letting every request through unauthenticated. These
//    routes trigger real side effects (emails to real users, DB deletes)
//    and are meant to be called only by a scheduled job presenting a
//    shared secret. They now refuse to serve at all when the secret isn't
//    configured, in every environment, rather than becoming public.

import request from 'supertest';
import fs from 'fs';
import path from 'path';
import app from '../../index';

const CRON_SECRET = 'test-cron-secret-1234567890';

function cronJobUrlPath(jobName: string): string {
  const renderYamlPath = path.join(__dirname, '../../../../../render.yaml');
  const contents = fs.readFileSync(renderYamlPath, 'utf8');

  // Minimal, deliberately naive parse: find the `- name: <jobName>` cron
  // entry and the `url:` line that follows it. Good enough for this
  // config's shape without pulling in a YAML parser dependency just for
  // one regression test.
  const nameIndex = contents.indexOf(`name: ${jobName}`);
  expect(nameIndex).toBeGreaterThan(-1);

  const afterName = contents.slice(nameIndex);
  const urlMatch = afterName.match(/url:\s*(\S+)/);
  expect(urlMatch).not.toBeNull();

  const fullUrl = new URL(urlMatch![1]);
  return fullUrl.pathname;
}

describe('render.yaml memory-reports cron job', () => {
  const originalCronSecret = process.env.CRON_SECRET;

  beforeEach(() => {
    process.env.CRON_SECRET = CRON_SECRET;
  });

  afterAll(() => {
    if (originalCronSecret === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = originalCronSecret;
  });

  it('points at a path the server actually serves', async () => {
    const configuredPath = cronJobUrlPath('memory-reports');

    const response = await request(app)
      .post(configuredPath)
      .set('Authorization', `Bearer ${CRON_SECRET}`);

    expect(response.status).not.toBe(404);
    expect(response.body).toHaveProperty('success', true);
  });

  it('documents the exact bug: the old /api/v1/cron/... prefix 404s', async () => {
    const response = await request(app)
      .post('/api/v1/cron/memory-reports')
      .set('Authorization', `Bearer ${CRON_SECRET}`);

    expect(response.status).toBe(404);
  });

  it('the real route lives under /admin/cron', async () => {
    const response = await request(app)
      .post('/admin/cron/memory-reports')
      .set('Authorization', `Bearer ${CRON_SECRET}`);

    expect(response.status).not.toBe(404);
    expect(response.body).toEqual(
      expect.objectContaining({ success: true, reportsGenerated: expect.any(Number) })
    );
  });
});

describe('/admin/cron auth (fails closed, not open)', () => {
  const originalCronSecret = process.env.CRON_SECRET;

  afterEach(() => {
    if (originalCronSecret === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = originalCronSecret;
  });

  it.each([
    ['/admin/cron/weekly-insights'],
    ['/admin/cron/prune-versions'],
    ['/admin/cron/memory-reports'],
  ])('refuses to serve %s with 503 when CRON_SECRET is unset, rather than running unauthenticated', async (routePath) => {
    delete process.env.CRON_SECRET;

    const response = await request(app).post(routePath);

    expect(response.status).toBe(503);
    expect(response.body).toHaveProperty('error');
  });

  it('rejects a request with the wrong secret with 401', async () => {
    process.env.CRON_SECRET = CRON_SECRET;

    const response = await request(app)
      .post('/admin/cron/memory-reports')
      .set('Authorization', 'Bearer wrong-secret');

    expect(response.status).toBe(401);
  });

  it('accepts a request with the correct secret', async () => {
    process.env.CRON_SECRET = CRON_SECRET;

    const response = await request(app)
      .post('/admin/cron/prune-versions')
      .set('Authorization', `Bearer ${CRON_SECRET}`);

    expect(response.status).toBe(200);
  });
});

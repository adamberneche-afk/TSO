// Regression test for the production cron job hitting a 404 because
// render.yaml's configured URL used the wrong route prefix.
//
// cron.ts's router is mounted at '/admin/cron' (see index.ts:
// `app.use('/admin/cron', cronRoutes(...))`), but render.yaml's cron
// job pointed at `/api/v1/cron/memory-reports` -- a path this server
// never served, so the nightly memory-report generation silently 404'd
// in production every single run.
//
// This test drives the actual mounted Express app (no mocked router)
// and parses the real render.yaml so a future drift between the two --
// either side changing without the other -- fails a real request, not
// just a string comparison.

import request from 'supertest';
import fs from 'fs';
import path from 'path';
import app from '../../index';

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
  it('points at a path the server actually serves', async () => {
    const configuredPath = cronJobUrlPath('memory-reports');

    const response = await request(app).post(configuredPath);

    expect(response.status).not.toBe(404);
    expect(response.body).toHaveProperty('success', true);
  });

  it('documents the exact bug: the old /api/v1/cron/... prefix 404s', async () => {
    const response = await request(app).post('/api/v1/cron/memory-reports');

    expect(response.status).toBe(404);
  });

  it('the real route lives under /admin/cron', async () => {
    const response = await request(app).post('/admin/cron/memory-reports');

    expect(response.status).not.toBe(404);
    expect(response.body).toEqual(
      expect.objectContaining({ success: true, reportsGenerated: expect.any(Number) })
    );
  });
});

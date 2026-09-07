// Regression test: loadConfig() used to have no check at all for
// CRON_SECRET -- a production deploy missing it would boot up fine and
// silently leave /admin/cron/* permanently disabled (503, per
// routes/cron.ts's own fail-closed fix) until someone happened to notice.
// It now fails loudly at startup instead.

import { loadConfig } from '../../config/index';

describe('loadConfig CRON_SECRET production check', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalCronSecret = process.env.CRON_SECRET;

  afterEach(() => {
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalNodeEnv;
    if (originalCronSecret === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = originalCronSecret;
  });

  it('throws at startup when NODE_ENV=production and CRON_SECRET is unset', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.CRON_SECRET;

    expect(() => loadConfig()).toThrow(/CRON_SECRET is required in production/);
  });

  it('does not throw when NODE_ENV=production and CRON_SECRET is set', () => {
    process.env.NODE_ENV = 'production';
    process.env.CRON_SECRET = 'a-real-secret';

    expect(() => loadConfig()).not.toThrow();
  });

  it('does not throw outside production even when CRON_SECRET is unset', () => {
    process.env.NODE_ENV = 'development';
    delete process.env.CRON_SECRET;

    expect(() => loadConfig()).not.toThrow();
  });
});

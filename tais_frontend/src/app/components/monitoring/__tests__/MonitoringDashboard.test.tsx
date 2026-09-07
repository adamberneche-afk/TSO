// @vitest-environment jsdom
//
// Regression test for MonitoringDashboard's permanently-stuck loading
// spinner. `isLoading` was initialized to `true` and never set back to
// `false` on either the success or failure path of fetchDashboard -- the
// render logic checks `isLoading` before the error/data branches, so the
// component was stuck showing the spinner forever regardless of what the
// fetch actually did.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

const get = vi.fn();

vi.mock('../../../../api/client', () => ({
  api: { get: (...args: unknown[]) => get(...args) },
}));
vi.mock('../../../../lib/env', () => ({ env: { registryUrl: 'https://example.test' } }));

import { MonitoringDashboard } from '../MonitoringDashboard';

describe('MonitoringDashboard loading state', () => {
  beforeEach(() => {
    get.mockReset();
  });

  it('stops showing the spinner after a successful fetch', async () => {
    get.mockResolvedValue({
      timestamp: new Date().toISOString(),
      health: { database: true, system: { status: 'healthy', uptime: 100, load: [0.1, 0.2, 0.3] }, overall: 'healthy' },
      performance: { memory: { used: 10, total: 100, percentage: 10 }, cpu: {}, uptime: 100 },
      alerts: { active: 0, critical: 0, warning: 0 },
    });

    render(<MonitoringDashboard />);

    await waitFor(() => expect(screen.getByText('System Monitoring')).toBeTruthy());
  });

  it('stops showing the spinner after a failed fetch, and shows the error instead', async () => {
    get.mockRejectedValue(new Error('boom'));

    render(<MonitoringDashboard />);

    await waitFor(() => expect(screen.getByText('boom')).toBeTruthy());
  });
});

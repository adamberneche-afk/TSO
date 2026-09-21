// Regression test for configApi.ts's saveConfiguration/updateConfiguration
// double-wrapping their request bodies as `{ data: {...} }` -- the same
// bug class as registry-client.ts's publishSkill fix. This one sat behind
// the product's core "answer 7 questions, save your agent" flow
// (GuidedDiscoveryWizard.tsx / ConfigPreview.tsx call saveConfiguration;
// Dashboard.tsx calls updateConfiguration): routes/configurations.ts's
// POST / and PUT /:id both do `const { name, description, configData,
// personalityMd } = req.body`, so a wrapped body always read `name` as
// undefined and 400'd with "Configuration name cannot be empty".

import { describe, it, expect, vi, beforeEach } from 'vitest';

const post = vi.fn();
const put = vi.fn();

vi.mock('@/api/client', () => ({
  api: {
    post: (...args: unknown[]) => post(...args),
    put: (...args: unknown[]) => put(...args),
  },
}));

import { configApi } from '../configApi';

describe('configApi.saveConfiguration', () => {
  beforeEach(() => {
    post.mockReset();
  });

  it('sends { name, configData, description } directly, not wrapped in { data: ... }', async () => {
    post.mockResolvedValue({ success: true, configuration: {}, limit: 10, remaining: 9 });
    await configApi.saveConfiguration('My Agent', { skills: [] }, 'A helpful agent');
    expect(post).toHaveBeenCalledWith('/api/v1/configurations', {
      name: 'My Agent',
      configData: { skills: [] },
      description: 'A helpful agent',
    });
  });
});

describe('configApi.updateConfiguration', () => {
  beforeEach(() => {
    put.mockReset();
  });

  it('sends the updates object directly, not wrapped in { data: ... }', async () => {
    put.mockResolvedValue({ success: true, configuration: {} });
    await configApi.updateConfiguration('config-1', { name: 'Renamed Agent' });
    expect(put).toHaveBeenCalledWith('/api/v1/configurations/config-1', { name: 'Renamed Agent' });
  });
});
